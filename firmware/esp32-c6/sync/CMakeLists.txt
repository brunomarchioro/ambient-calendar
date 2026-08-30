idf_component_register(
	SRCS "poll.c" "time_seed.c" "time_tz.c"
	INCLUDE_DIRS "."
	REQUIRES network storage esp_netif lwip
)
