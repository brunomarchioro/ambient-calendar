idf_component_register(
	SRCS "bsp.c" "hmi.c" "touch.c"
	INCLUDE_DIRS "."
	REQUIRES esp_common heap scheduler sync
)
