# cmake -P test_wifi_networks.cmake — rules of firmware/wifi-networks.json (ADR 0016).
set(GEN "${CMAKE_CURRENT_LIST_DIR}/../network/wifi_networks.cmake")
set(TMP "${CMAKE_CURRENT_LIST_DIR}/wifi_networks_tmp")
file(REMOVE_RECURSE "${TMP}")
file(MAKE_DIRECTORY "${TMP}")

function(run name json expect_ok)
	set(in "${TMP}/${name}.json")
	set(out "${TMP}/${name}.h")
	if(NOT json STREQUAL "<missing>")
		file(WRITE "${in}" "${json}")
	endif()
	execute_process(COMMAND "${CMAKE_COMMAND}" "-DIN=${in}" "-DOUT=${out}" -P "${GEN}"
		RESULT_VARIABLE rc OUTPUT_QUIET ERROR_VARIABLE err)
	if(expect_ok AND NOT rc EQUAL 0)
		message(FATAL_ERROR "${name}: expected ok, got:\n${err}")
	elseif(NOT expect_ok AND rc EQUAL 0)
		message(FATAL_ERROR "${name}: expected failure")
	endif()
	if(NOT expect_ok AND err MATCHES "secret-pass")
		message(FATAL_ERROR "${name}: error leaks password:\n${err}")
	endif()
endfunction()

run(ok [=[[{"ssid":"casa","password":"p\"a\\ss;word"},{"ssid":"Café 5G","password":"12345678"}]]=] TRUE)
file(READ "${TMP}/ok.h" h)
foreach(want
		"#define ALERTS_WIFI_NETWORK_COUNT 2"
		[=[{"casa", "p\"a\\ss;word"}]=]
		[=[{"Café 5G", "12345678"}]=])
	string(FIND "${h}" "${want}" at)
	if(at EQUAL -1)
		message(FATAL_ERROR "ok.h missing ${want}:\n${h}")
	endif()
endforeach()

run(three [=[[{"ssid":"a","password":"secret-pass"},{"ssid":"b","password":"secret-pass"},{"ssid":"c","password":"secret-pass"}]]=] TRUE)

run(missing "<missing>" FALSE)
run(invalid_json [=[[{"ssid":"a","password":"secret-pass"]=] FALSE)
run(not_array [=[{"ssid":"a","password":"secret-pass"}]=] FALSE)
run(empty "[]" FALSE)
run(four [=[[{"ssid":"a","password":"secret-pass"},{"ssid":"b","password":"secret-pass"},{"ssid":"c","password":"secret-pass"},{"ssid":"d","password":"secret-pass"}]]=] FALSE)
run(no_ssid [=[[{"password":"secret-pass"}]]=] FALSE)
run(empty_ssid [=[[{"ssid":"","password":"secret-pass"}]]=] FALSE)
run(long_ssid [=[[{"ssid":"123456789012345678901234567890123","password":"secret-pass"}]]=] FALSE)
run(no_password [=[[{"ssid":"a"}]]=] FALSE)
run(empty_password [=[[{"ssid":"a","password":""}]]=] FALSE)
run(short_password [=[[{"ssid":"a","password":"1234567"}]]=] FALSE)
run(long_password [=[[{"ssid":"a","password":"12345678901234567890123456789012345678901234567890123456789012345"}]]=] FALSE)

run(hex_password [=[[{"ssid":"a","password":"0123456789abcdef0123456789ABCDEF0123456789abcdef0123456789abcdef"}]]=] TRUE)
run(non_hex_64 [=[[{"ssid":"a","password":"secret-pass-secret-pass-secret-pass-secret-pass-secret-pass-1234"}]]=] FALSE)
run(numeric_ssid [=[[{"ssid":12345,"password":"secret-pass"}]]=] FALSE)
run(numeric_password [=[[{"ssid":"a","password":12345678}]]=] FALSE)

file(REMOVE_RECURSE "${TMP}")
message(STATUS "test_wifi_networks: ok")
