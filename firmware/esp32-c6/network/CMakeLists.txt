idf_component_register(
	SRCS "wifi.c" "http_schedule.c"
	INCLUDE_DIRS "."
	REQUIRES esp_wifi esp_event esp_netif esp_http_client esp-tls nvs_flash
)
