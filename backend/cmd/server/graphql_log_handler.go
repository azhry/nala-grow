package main

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"sync"
)

// graphqlReadableHandler keeps ordinary server events in compact JSON while
// rendering GraphQL request events as indented JSON for terminal readability.
// The rendered GraphQL event remains a complete JSON object and retains all
// structured fields for consumers that read the stream as JSON records.
type graphqlReadableHandler struct {
	fallback slog.Handler
	out      io.Writer
	mu       *sync.Mutex
	attrs    []graphqlScopedAttr
	groups   []string
}

type graphqlScopedAttr struct {
	attr   slog.Attr
	groups []string
}

func newGraphQLLogHandler(out io.Writer, options *slog.HandlerOptions) slog.Handler {
	return &graphqlReadableHandler{
		fallback: slog.NewJSONHandler(out, options),
		out:      out,
		mu:       &sync.Mutex{},
	}
}

func (h *graphqlReadableHandler) Enabled(ctx context.Context, level slog.Level) bool {
	return h.fallback.Enabled(ctx, level)
}

func (h *graphqlReadableHandler) Handle(ctx context.Context, record slog.Record) error {
	if record.Message != "graphql request" {
		return h.fallback.Handle(ctx, record)
	}

	event := make(map[string]interface{})
	if !record.Time.IsZero() {
		event["time"] = record.Time
	}
	event["level"] = record.Level.String()
	event["msg"] = record.Message
	for _, scoped := range h.attrs {
		addGraphQLLogAttr(event, scoped.groups, scoped.attr)
	}
	record.Attrs(func(attr slog.Attr) bool {
		addGraphQLLogAttr(event, h.groups, attr)
		return true
	})

	formatted, err := json.MarshalIndent(event, "", "  ")
	if err != nil {
		return h.fallback.Handle(ctx, record)
	}
	formatted = append(formatted, '\n')

	h.mu.Lock()
	defer h.mu.Unlock()
	_, err = h.out.Write(formatted)
	return err
}

func (h *graphqlReadableHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	if len(attrs) == 0 {
		return h
	}
	allAttrs := make([]graphqlScopedAttr, 0, len(h.attrs)+len(attrs))
	allAttrs = append(allAttrs, h.attrs...)
	for _, attr := range attrs {
		allAttrs = append(allAttrs, graphqlScopedAttr{attr: attr, groups: append([]string(nil), h.groups...)})
	}
	return &graphqlReadableHandler{
		fallback: h.fallback.WithAttrs(attrs),
		out:      h.out,
		mu:       h.mu,
		attrs:    allAttrs,
		groups:   append([]string(nil), h.groups...),
	}
}

func (h *graphqlReadableHandler) WithGroup(name string) slog.Handler {
	return &graphqlReadableHandler{
		fallback: h.fallback.WithGroup(name),
		out:      h.out,
		mu:       h.mu,
		attrs:    h.attrs,
		groups:   append(append([]string(nil), h.groups...), name),
	}
}

func addGraphQLLogAttr(target map[string]interface{}, groups []string, attr slog.Attr) {
	if attr.Key == "" {
		return
	}
	for _, group := range groups {
		if group == "" {
			continue
		}
		nested, ok := target[group].(map[string]interface{})
		if !ok {
			nested = make(map[string]interface{})
			target[group] = nested
		}
		target = nested
	}
	target[attr.Key] = graphQLSlogValue(attr.Value)
}

func graphQLSlogValue(value slog.Value) interface{} {
	value = value.Resolve()
	switch value.Kind() {
	case slog.KindAny:
		return value.Any()
	case slog.KindBool:
		return value.Bool()
	case slog.KindDuration:
		return value.Duration().String()
	case slog.KindFloat64:
		return value.Float64()
	case slog.KindInt64:
		return value.Int64()
	case slog.KindString:
		return value.String()
	case slog.KindTime:
		return value.Time()
	case slog.KindUint64:
		return value.Uint64()
	case slog.KindGroup:
		group := make(map[string]interface{})
		for _, attr := range value.Group() {
			addGraphQLLogAttr(group, nil, attr)
		}
		return group
	default:
		return nil
	}
}
