CC ?= gcc
CFLAGS ?= -std=c11 -Wall -Wextra -Werror -I../storage -I../scheduler

.PHONY: test clean

test: test_schedule_parse test_scheduler_eval
	./test_schedule_parse
	./test_scheduler_eval

test_schedule_parse: test_schedule_parse.c ../storage/schedule_parse.c ../storage/schedule_parse.h ../storage/schedule.h
	$(CC) $(CFLAGS) -o $@ test_schedule_parse.c ../storage/schedule_parse.c

test_scheduler_eval: test_scheduler_eval.c ../scheduler/scheduler_eval.c ../scheduler/scheduler_eval.h ../storage/schedule.h
	$(CC) $(CFLAGS) -o $@ test_scheduler_eval.c ../scheduler/scheduler_eval.c

clean:
	rm -f test_schedule_parse test_scheduler_eval
