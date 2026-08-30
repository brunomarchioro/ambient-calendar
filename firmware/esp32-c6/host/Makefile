CC ?= gcc
CFLAGS ?= -std=c11 -Wall -Wextra -Werror -I../storage -I../ui
STUB_INC = -I./stubs -I../network -I../storage -I../sync
HOST_POLL_CFLAGS = $(CFLAGS) -DALERTS_POLL_HOST_TEST $(STUB_INC)

.PHONY: test clean

test: test_schedule_parse test_hmi_frame test_poll
	./test_schedule_parse
	./test_hmi_frame
	./test_poll

test_schedule_parse: test_schedule_parse.c ../storage/schedule_parse.c ../storage/schedule_parse.h ../storage/schedule.h
	$(CC) $(CFLAGS) -o $@ test_schedule_parse.c ../storage/schedule_parse.c

test_hmi_frame: test_hmi_frame.c ../ui/hmi_frame.c ../ui/hmi_frame.h ../storage/schedule.h
	$(CC) $(CFLAGS) -o $@ test_hmi_frame.c ../ui/hmi_frame.c

test_poll: test_poll.c poll_test_stubs.c poll_test_stubs.h ../sync/poll.c ../sync/poll.h ../storage/schedule_parse.c
	$(CC) $(HOST_POLL_CFLAGS) -o $@ test_poll.c poll_test_stubs.c ../sync/poll.c ../storage/schedule_parse.c

clean:
	rm -f test_schedule_parse test_hmi_frame test_poll
