#include "schedule_parse.h"

#include <ctype.h>
#include <limits.h>
#include <string.h>

typedef struct {
	const char *p;
	const char *end;
} cur_t;

static void skip_ws(cur_t *c)
{
	while (c->p < c->end && isspace((unsigned char)*c->p)) {
		c->p++;
	}
}

static int peek(const cur_t *c)
{
	if (c->p >= c->end) {
		return -1;
	}
	return (unsigned char)*c->p;
}

static int take(cur_t *c)
{
	if (c->p >= c->end) {
		return -1;
	}
	return (unsigned char)*c->p++;
}

static int expect_char(cur_t *c, char ch)
{
	skip_ws(c);
	if (take(c) != (unsigned char)ch) {
		return ALERTS_PARSE_SYNTAX;
	}
	return ALERTS_PARSE_OK;
}

static int hex_val(int ch)
{
	if (ch >= '0' && ch <= '9') {
		return ch - '0';
	}
	if (ch >= 'a' && ch <= 'f') {
		return ch - 'a' + 10;
	}
	if (ch >= 'A' && ch <= 'F') {
		return ch - 'A' + 10;
	}
	return -1;
}

static int parse_string(cur_t *c, char *out, size_t cap)
{
	size_t n = 0;
	int ch;
	skip_ws(c);
	if (take(c) != '"') {
		return ALERTS_PARSE_TYPE;
	}
	while ((ch = take(c)) != -1) {
		if (ch == '"') {
			if (n >= cap) {
				return ALERTS_PARSE_TRUNCATED;
			}
			out[n] = '\0';
			return ALERTS_PARSE_OK;
		}
		if (ch == '\\') {
			int esc = take(c);
			if (esc == -1) {
				return ALERTS_PARSE_SYNTAX;
			}
			switch (esc) {
			case '"':
			case '\\':
			case '/':
				ch = esc;
				break;
			case 'b':
				ch = '\b';
				break;
			case 'f':
				ch = '\f';
				break;
			case 'n':
				ch = '\n';
				break;
			case 'r':
				ch = '\r';
				break;
			case 't':
				ch = '\t';
				break;
			case 'u': {
				unsigned code = 0;
				int i;
				for (i = 0; i < 4; i++) {
					int hv = hex_val(take(c));
					if (hv < 0) {
						return ALERTS_PARSE_SYNTAX;
					}
					code = (code << 4) | (unsigned)hv;
				}
				if (code < 0x80) {
					ch = (int)code;
				} else if (code < 0x800) {
					if (n + 2 >= cap) {
						return ALERTS_PARSE_TRUNCATED;
					}
					out[n++] = (char)(0xC0 | (code >> 6));
					out[n++] = (char)(0x80 | (code & 0x3F));
					continue;
				} else {
					if (n + 3 >= cap) {
						return ALERTS_PARSE_TRUNCATED;
					}
					out[n++] = (char)(0xE0 | (code >> 12));
					out[n++] = (char)(0x80 | ((code >> 6) & 0x3F));
					out[n++] = (char)(0x80 | (code & 0x3F));
					continue;
				}
				break;
			}
			default:
				return ALERTS_PARSE_SYNTAX;
			}
		}
		if (n + 1 >= cap) {
			return ALERTS_PARSE_TRUNCATED;
		}
		out[n++] = (char)ch;
	}
	return ALERTS_PARSE_SYNTAX;
}

static int skip_string(cur_t *c)
{
	int ch;
	skip_ws(c);
	if (take(c) != '"') {
		return ALERTS_PARSE_TYPE;
	}
	while ((ch = take(c)) != -1) {
		if (ch == '"') {
			return ALERTS_PARSE_OK;
		}
		if (ch == '\\') {
			int esc = take(c);
			if (esc == -1) {
				return ALERTS_PARSE_SYNTAX;
			}
			if (esc == 'u') {
				if (take(c) < 0 || take(c) < 0 || take(c) < 0 || take(c) < 0) {
					return ALERTS_PARSE_SYNTAX;
				}
			}
		}
	}
	return ALERTS_PARSE_SYNTAX;
}

static int skip_value(cur_t *c);

static int skip_object(cur_t *c)
{
	int err;
	skip_ws(c);
	if (take(c) != '{') {
		return ALERTS_PARSE_SYNTAX;
	}
	skip_ws(c);
	if (peek(c) == '}') {
		c->p++;
		return ALERTS_PARSE_OK;
	}
	for (;;) {
		err = skip_string(c);
		if (err != ALERTS_PARSE_OK) {
			return err;
		}
		err = expect_char(c, ':');
		if (err != ALERTS_PARSE_OK) {
			return err;
		}
		err = skip_value(c);
		if (err != ALERTS_PARSE_OK) {
			return err;
		}
		skip_ws(c);
		if (peek(c) == ',') {
			c->p++;
			continue;
		}
		if (peek(c) == '}') {
			c->p++;
			return ALERTS_PARSE_OK;
		}
		return ALERTS_PARSE_SYNTAX;
	}
}

static int skip_array(cur_t *c)
{
	int err;
	skip_ws(c);
	if (take(c) != '[') {
		return ALERTS_PARSE_SYNTAX;
	}
	skip_ws(c);
	if (peek(c) == ']') {
		c->p++;
		return ALERTS_PARSE_OK;
	}
	for (;;) {
		err = skip_value(c);
		if (err != ALERTS_PARSE_OK) {
			return err;
		}
		skip_ws(c);
		if (peek(c) == ',') {
			c->p++;
			continue;
		}
		if (peek(c) == ']') {
			c->p++;
			return ALERTS_PARSE_OK;
		}
		return ALERTS_PARSE_SYNTAX;
	}
}

static int skip_literal(cur_t *c, const char *lit)
{
	size_t n = strlen(lit);
	skip_ws(c);
	if ((size_t)(c->end - c->p) < n || memcmp(c->p, lit, n) != 0) {
		return ALERTS_PARSE_SYNTAX;
	}
	c->p += n;
	return ALERTS_PARSE_OK;
}

static int skip_number(cur_t *c)
{
	skip_ws(c);
	if (peek(c) == '-') {
		c->p++;
	}
	if (peek(c) < '0' || peek(c) > '9') {
		return ALERTS_PARSE_SYNTAX;
	}
	while (peek(c) >= '0' && peek(c) <= '9') {
		c->p++;
	}
	if (peek(c) == '.') {
		c->p++;
		if (peek(c) < '0' || peek(c) > '9') {
			return ALERTS_PARSE_SYNTAX;
		}
		while (peek(c) >= '0' && peek(c) <= '9') {
			c->p++;
		}
	}
	if (peek(c) == 'e' || peek(c) == 'E') {
		c->p++;
		if (peek(c) == '+' || peek(c) == '-') {
			c->p++;
		}
		if (peek(c) < '0' || peek(c) > '9') {
			return ALERTS_PARSE_SYNTAX;
		}
		while (peek(c) >= '0' && peek(c) <= '9') {
			c->p++;
		}
	}
	return ALERTS_PARSE_OK;
}

static int skip_value(cur_t *c)
{
	int ch;
	skip_ws(c);
	ch = peek(c);
	if (ch == '"') {
		return skip_string(c);
	}
	if (ch == '{') {
		return skip_object(c);
	}
	if (ch == '[') {
		return skip_array(c);
	}
	if (ch == 't') {
		return skip_literal(c, "true");
	}
	if (ch == 'f') {
		return skip_literal(c, "false");
	}
	if (ch == 'n') {
		return skip_literal(c, "null");
	}
	if (ch == '-' || (ch >= '0' && ch <= '9')) {
		return skip_number(c);
	}
	return ALERTS_PARSE_SYNTAX;
}

static int parse_int(cur_t *c, int *out)
{
	int sign = 1;
	long v = 0;
	skip_ws(c);
	if (peek(c) == '-') {
		sign = -1;
		c->p++;
	}
	if (peek(c) < '0' || peek(c) > '9') {
		return ALERTS_PARSE_TYPE;
	}
	while (peek(c) >= '0' && peek(c) <= '9') {
		v = v * 10 + (peek(c) - '0');
		if (v > 1000000) {
			return ALERTS_PARSE_TYPE;
		}
		c->p++;
	}
	*out = (int)(sign * v);
	return ALERTS_PARSE_OK;
}

static int parse_int64(cur_t *c, int64_t *out)
{
	int sign = 1;
	int64_t v = 0;
	int64_t cap = INT64_MAX / 10;
	skip_ws(c);
	if (peek(c) == '-') {
		sign = -1;
		c->p++;
	}
	if (peek(c) < '0' || peek(c) > '9') {
		return ALERTS_PARSE_TYPE;
	}
	while (peek(c) >= '0' && peek(c) <= '9') {
		int digit = peek(c) - '0';
		if (v > cap || (v == cap && digit > INT64_MAX % 10)) {
			return ALERTS_PARSE_TYPE;
		}
		v = v * 10 + digit;
		c->p++;
	}
	*out = sign < 0 ? -v : v;
	return ALERTS_PARSE_OK;
}

static int parse_bool(cur_t *c, bool *out)
{
	skip_ws(c);
	if (skip_literal(c, "true") == ALERTS_PARSE_OK) {
		*out = true;
		return ALERTS_PARSE_OK;
	}
	if (skip_literal(c, "false") == ALERTS_PARSE_OK) {
		*out = false;
		return ALERTS_PARSE_OK;
	}
	return ALERTS_PARSE_TYPE;
}

static int parse_end_unix(cur_t *c, alerts_event_t *ev)
{
	skip_ws(c);
	if (peek(c) == 'n') {
		int err = skip_literal(c, "null");
		if (err != ALERTS_PARSE_OK) {
			return ALERTS_PARSE_TYPE;
		}
		ev->has_end = false;
		ev->end_unix = 0;
		return ALERTS_PARSE_OK;
	}
	{
		int err = parse_int64(c, &ev->end_unix);
		if (err != ALERTS_PARSE_OK) {
			return err;
		}
		ev->has_end = true;
		return ALERTS_PARSE_OK;
	}
}

static int validate_event(const alerts_event_t *ev)
{
	if (ev->start_unix <= 0) {
		return ALERTS_PARSE_MISSING;
	}
	if (ev->has_end && ev->end_unix <= ev->start_unix) {
		return ALERTS_PARSE_MISSING;
	}
	return ALERTS_PARSE_OK;
}

static int parse_event(cur_t *c, alerts_event_t *ev)
{
	bool saw_id = false, saw_title = false, saw_start = false, saw_end = false, saw_all_day = false;
	int err;
	memset(ev, 0, sizeof(*ev));
	skip_ws(c);
	if (take(c) != '{') {
		return ALERTS_PARSE_TYPE;
	}
	skip_ws(c);
	if (peek(c) == '}') {
		c->p++;
		return ALERTS_PARSE_MISSING;
	}
	for (;;) {
		char key[32];
		err = parse_string(c, key, sizeof(key));
		if (err != ALERTS_PARSE_OK) {
			return err;
		}
		err = expect_char(c, ':');
		if (err != ALERTS_PARSE_OK) {
			return err;
		}
		if (strcmp(key, "id") == 0) {
			err = parse_string(c, ev->id, sizeof(ev->id));
			saw_id = true;
		} else if (strcmp(key, "title") == 0) {
			err = parse_string(c, ev->title, sizeof(ev->title));
			saw_title = true;
		} else if (strcmp(key, "startUnix") == 0) {
			err = parse_int64(c, &ev->start_unix);
			saw_start = true;
		} else if (strcmp(key, "endUnix") == 0) {
			err = parse_end_unix(c, ev);
			saw_end = true;
		} else if (strcmp(key, "allDay") == 0) {
			err = parse_bool(c, &ev->all_day);
			saw_all_day = true;
		} else {
			err = skip_value(c);
		}
		if (err != ALERTS_PARSE_OK) {
			return err;
		}
		skip_ws(c);
		if (peek(c) == ',') {
			c->p++;
			continue;
		}
		if (peek(c) == '}') {
			c->p++;
			break;
		}
		return ALERTS_PARSE_SYNTAX;
	}
	if (!saw_id || !saw_title || !saw_start || !saw_end || !saw_all_day) {
		return ALERTS_PARSE_MISSING;
	}
	if (ev->id[0] == '\0') {
		return ALERTS_PARSE_MISSING;
	}
	return validate_event(ev);
}

static int parse_events(cur_t *c, alerts_schedule_t *out)
{
	int err;
	skip_ws(c);
	if (take(c) != '[') {
		return ALERTS_PARSE_TYPE;
	}
	skip_ws(c);
	if (peek(c) == ']') {
		c->p++;
		out->event_count = 0;
		return ALERTS_PARSE_OK;
	}
	for (;;) {
		if (out->event_count < ALERTS_MAX_EVENTS) {
			err = parse_event(c, &out->events[out->event_count]);
			if (err != ALERTS_PARSE_OK) {
				return err;
			}
			out->event_count++;
		} else {
			alerts_event_t discard;
			err = parse_event(c, &discard);
			if (err != ALERTS_PARSE_OK) {
				return err;
			}
		}
		skip_ws(c);
		if (peek(c) == ',') {
			c->p++;
			continue;
		}
		if (peek(c) == ']') {
			c->p++;
			return ALERTS_PARSE_OK;
		}
		return ALERTS_PARSE_SYNTAX;
	}
}

int alerts_schedule_parse(const char *json, size_t len, alerts_schedule_t *out)
{
	cur_t c;
	bool saw_server = false, saw_tz = false, saw_rem = false, saw_show = false, saw_events = false;
	int err;
	if (json == NULL || out == NULL) {
		return ALERTS_PARSE_ARG;
	}
	memset(out, 0, sizeof(*out));
	c.p = json;
	c.end = json + len;
	skip_ws(&c);
	if (take(&c) != '{') {
		return ALERTS_PARSE_SYNTAX;
	}
	skip_ws(&c);
	if (peek(&c) == '}') {
		return ALERTS_PARSE_MISSING;
	}
	for (;;) {
		char key[32];
		err = parse_string(&c, key, sizeof(key));
		if (err != ALERTS_PARSE_OK) {
			return err;
		}
		err = expect_char(&c, ':');
		if (err != ALERTS_PARSE_OK) {
			return err;
		}
		if (strcmp(key, "serverUnix") == 0) {
			err = parse_int64(&c, &out->server_unix);
			saw_server = true;
		} else if (strcmp(key, "timezone") == 0) {
			err = parse_string(&c, out->timezone, sizeof(out->timezone));
			saw_tz = true;
		} else if (strcmp(key, "reminderMinutes") == 0) {
			err = parse_int(&c, &out->reminder_minutes);
			saw_rem = true;
		} else if (strcmp(key, "showNextEvents") == 0) {
			err = parse_int(&c, &out->show_next_events);
			saw_show = true;
		} else if (strcmp(key, "events") == 0) {
			err = parse_events(&c, out);
			saw_events = true;
		} else {
			err = skip_value(&c);
		}
		if (err != ALERTS_PARSE_OK) {
			return err;
		}
		skip_ws(&c);
		if (peek(&c) == ',') {
			c.p++;
			continue;
		}
		if (peek(&c) == '}') {
			c.p++;
			break;
		}
		return ALERTS_PARSE_SYNTAX;
	}
	skip_ws(&c);
	if (c.p != c.end) {
		return ALERTS_PARSE_SYNTAX;
	}
	if (!saw_server || !saw_tz || !saw_rem || !saw_show || !saw_events) {
		return ALERTS_PARSE_MISSING;
	}
	if (out->timezone[0] == '\0' || out->server_unix <= 0) {
		return ALERTS_PARSE_MISSING;
	}
	return ALERTS_PARSE_OK;
}

const char *alerts_schedule_parse_strerror(int err)
{
	switch (err) {
	case ALERTS_PARSE_OK:
		return "ok";
	case ALERTS_PARSE_ARG:
		return "arg";
	case ALERTS_PARSE_TRUNCATED:
		return "truncated";
	case ALERTS_PARSE_SYNTAX:
		return "syntax";
	case ALERTS_PARSE_MISSING:
		return "missing";
	case ALERTS_PARSE_TYPE:
		return "type";
	default:
		return "unknown";
	}
}
