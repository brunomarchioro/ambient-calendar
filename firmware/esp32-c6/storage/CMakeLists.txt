idf_component_register(
	SRCS "schedule_parse.c" "nvs_meta.c" "littlefs_cache.c"
	INCLUDE_DIRS "."
	REQUIRES nvs_flash joltwallet__littlefs
)
