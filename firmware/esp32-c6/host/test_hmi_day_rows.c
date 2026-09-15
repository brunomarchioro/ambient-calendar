#include "hmi_day_rows.h"

#include <assert.h>
#include <stdio.h>

#define TODAY 20260915

static void assert_row(const hmi_day_row_t *row, hmi_day_row_kind_t kind, size_t event_index)
{
	assert(row->kind == kind);
	assert(row->event_index == event_index);
}

static void test_today_only(void)
{
	const int keys[] = {20260915};
	hmi_day_row_t rows[4];
	const size_t n = hmi_day_rows_plan(TODAY, keys, 1, 4, rows);
	assert(n == 1);
	assert_row(&rows[0], HMI_DAY_ROW_EVENT, 0);
}

static void test_first_item_tomorrow(void)
{
	const int keys[] = {20260916};
	hmi_day_row_t rows[4];
	const size_t n = hmi_day_rows_plan(TODAY, keys, 1, 4, rows);
	assert(n == 2);
	assert_row(&rows[0], HMI_DAY_ROW_HEADER, 0);
	assert_row(&rows[1], HMI_DAY_ROW_EVENT, 0);
}

static void test_multi_day_full_budget(void)
{
	const int keys[] = {20260915, 20260916, 20260916, 20260917};
	hmi_day_row_t rows[8];
	const size_t n = hmi_day_rows_plan(TODAY, keys, 4, 8, rows);
	assert(n == 6);
	assert_row(&rows[0], HMI_DAY_ROW_EVENT, 0);
	assert_row(&rows[1], HMI_DAY_ROW_HEADER, 1);
	assert_row(&rows[2], HMI_DAY_ROW_EVENT, 1);
	assert_row(&rows[3], HMI_DAY_ROW_EVENT, 2);
	assert_row(&rows[4], HMI_DAY_ROW_HEADER, 3);
	assert_row(&rows[5], HMI_DAY_ROW_EVENT, 3);
}

static void test_no_orphan_header(void)
{
	const int keys[] = {20260915, 20260916, 20260916, 20260917};
	hmi_day_row_t rows[5];
	const size_t n = hmi_day_rows_plan(TODAY, keys, 4, 5, rows);
	assert(n == 4);
	assert_row(&rows[0], HMI_DAY_ROW_EVENT, 0);
	assert_row(&rows[1], HMI_DAY_ROW_HEADER, 1);
	assert_row(&rows[2], HMI_DAY_ROW_EVENT, 1);
	assert_row(&rows[3], HMI_DAY_ROW_EVENT, 2);
}

static void test_budget_stops_mid_day(void)
{
	const int keys[] = {20260916, 20260916};
	hmi_day_row_t rows[2];
	const size_t n = hmi_day_rows_plan(TODAY, keys, 2, 2, rows);
	assert(n == 2);
	assert_row(&rows[0], HMI_DAY_ROW_HEADER, 0);
	assert_row(&rows[1], HMI_DAY_ROW_EVENT, 0);
}

static void test_empty(void)
{
	hmi_day_row_t rows[4];
	const size_t n = hmi_day_rows_plan(TODAY, NULL, 0, 4, rows);
	assert(n == 0);
}

static void test_unknown_day_grouped(void)
{
	const int keys[] = {-1, -1};
	hmi_day_row_t rows[4];
	const size_t n = hmi_day_rows_plan(TODAY, keys, 2, 4, rows);
	assert(n == 3);
	assert_row(&rows[0], HMI_DAY_ROW_HEADER, 0);
	assert_row(&rows[1], HMI_DAY_ROW_EVENT, 0);
	assert_row(&rows[2], HMI_DAY_ROW_EVENT, 1);
}

static void test_header_needs_two_slots(void)
{
	const int keys[] = {20260916};
	hmi_day_row_t rows[1];
	const size_t n = hmi_day_rows_plan(TODAY, keys, 1, 1, rows);
	assert(n == 0);
}

int main(void)
{
	test_today_only();
	test_first_item_tomorrow();
	test_multi_day_full_budget();
	test_no_orphan_header();
	test_budget_stops_mid_day();
	test_empty();
	test_unknown_day_grouped();
	test_header_needs_two_slots();
	printf("test_hmi_day_rows: ok\n");
	return 0;
}
