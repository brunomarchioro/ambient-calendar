cmake_minimum_required(VERSION 3.16)

set(_alerts_devvars "${CMAKE_CURRENT_SOURCE_DIR}/sdkconfig.defaults.devvars")
if(EXISTS "${_alerts_devvars}")
	set(SDKCONFIG_DEFAULTS "sdkconfig.defaults;${_alerts_devvars}")
endif()

set(EXTRA_COMPONENT_DIRS network storage sync ui)

# EIM leaves IDF_COMPONENT_MANAGER unset; CMake treats empty EQUAL 0 and skips the manager.
set(ENV{IDF_COMPONENT_MANAGER} "1")
if(NOT DEFINED ENV{IDF_TARGET})
	set(ENV{IDF_TARGET} "esp32c6")
endif()
unset(ENV{IDF_COMPONENT_LOCAL_STORAGE_URL})

include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(alerts)
