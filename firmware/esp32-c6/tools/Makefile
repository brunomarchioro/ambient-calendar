CC ?= gcc
COMMON := ../../common
CFLAGS ?= -std=c11 -Wall -Wextra -Werror -D_POSIX_C_SOURCE=200809L -I$(COMMON)/dotenv -I$(COMMON)

DEVVARS ?= ../../.dev.vars
OUT := ../sdkconfig.defaults.devvars

.PHONY: sync-devvars clean

sync-devvars: devvars_to_sdkconfig
	./devvars_to_sdkconfig $(DEVVARS) $(OUT)

devvars_to_sdkconfig: devvars_to_sdkconfig.c $(COMMON)/dotenv/dotenv.c $(COMMON)/alerts_devvars.c
	$(CC) $(CFLAGS) -o $@ devvars_to_sdkconfig.c $(COMMON)/dotenv/dotenv.c $(COMMON)/alerts_devvars.c

clean:
	rm -f devvars_to_sdkconfig
