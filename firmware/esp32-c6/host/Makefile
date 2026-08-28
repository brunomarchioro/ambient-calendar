CC ?= gcc
CFLAGS ?= -std=c11 -Wall -Wextra -Werror -I../storage -I../ui

.PHONY: test clean

test: test_schedule_parse test_hmi_frame
	./test_schedule_parse
	./test_hmi_frame

test_schedule_parse: test_schedule_parse.c ../storage/schedule_parse.c ../storage/schedule_parse.h ../storage/schedule.h
	$(CC) $(CFLAGS) -o $@ test_schedule_parse.c ../storage/schedule_parse.c

test_hmi_frame: test_hmi_frame.c ../ui/hmi_frame.c ../ui/hmi_frame.h ../storage/schedule.h
	$(CC) $(CFLAGS) -o $@ test_hmi_frame.c ../ui/hmi_frame.c

clean:
	rm -f test_schedule_parse test_hmi_frame
