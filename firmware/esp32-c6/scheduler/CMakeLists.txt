idf_component_register(
	SRCS "scheduler.c" "scheduler_eval.c"
	INCLUDE_DIRS "."
	REQUIRES sync storage
)
