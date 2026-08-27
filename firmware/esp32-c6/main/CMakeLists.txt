idf_component_register(
	SRCS "app_main.c"
	INCLUDE_DIRS "."
	REQUIRES network storage sync scheduler ui nvs_flash esp_event
)
