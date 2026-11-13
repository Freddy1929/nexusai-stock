#!/bin/sh
set -eu

config_file=/tmp/nexusai-odoo.conf
umask 077
printf '[options]\nadmin_passwd = %s\naddons_path = /mnt/enterprise-addons,/usr/lib/python3/dist-packages/odoo/addons,/mnt/extra-addons\n' \
  "$ODOO_MASTER_PASSWORD" > "$config_file"
export ODOO_RC="$config_file"

exec /entrypoint.sh "$@"
