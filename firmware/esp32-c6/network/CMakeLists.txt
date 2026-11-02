idf_component_register(
	SRCS "wifi.c" "wifi_select.c" "http_schedule.c"
	INCLUDE_DIRS "."
	REQUIRES esp_wifi esp_event esp_netif esp_timer esp_http_client esp-tls nvs_flash
)

if(NOT CMAKE_BUILD_EARLY_EXPANSION)
	include("${CMAKE_CURRENT_LIST_DIR}/wifi_networks.cmake")
	set(_wifi_json "${CMAKE_CURRENT_LIST_DIR}/../../wifi-networks.json")
	set_property(DIRECTORY APPEND PROPERTY CMAKE_CONFIGURE_DEPENDS "${_wifi_json}")
	alerts_wifi_networks_generate("${_wifi_json}" "${CMAKE_CURRENT_BINARY_DIR}/wifi_networks.gen.h")
	target_include_directories(${COMPONENT_LIB} PRIVATE "${CMAKE_CURRENT_BINARY_DIR}")
endif()
