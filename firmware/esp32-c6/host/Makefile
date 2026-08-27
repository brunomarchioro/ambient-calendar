CC ?= gcc
CFLAGS ?= -std=c11 -Wall -Wextra -Werror -I../storage

.PHONY: test clean

test: test_schedule_parse
	./test_schedule_parse

test_schedule_parse: test_schedule_parse.c ../storage/schedule_parse.c ../storage/schedule_parse.h ../storage/schedule.h
	$(CC) $(CFLAGS) -o $@ test_schedule_parse.c ../storage/schedule_parse.c

clean:
	rm -f test_schedule_parse
