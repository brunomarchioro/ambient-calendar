cmake_minimum_required(VERSION 3.16)

set(_alerts_devvars "${CMAKE_CURRENT_SOURCE_DIR}/sdkconfig.defaults.devvars")
if(EXISTS "${_alerts_devvars}")
	set(SDKCONFIG_DEFAULTS "sdkconfig.defaults;${_alerts_devvars}")
endif()

include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(alerts)
