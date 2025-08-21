#!/bin/sh
# wait-for-redis.sh

host="$1"
port="$2"
shift 2
cmd="$@"

# Wait for Redis to be ready (with password support)
until redis-cli -h $host -p $port -a $REDIS_PASSWORD ping | grep -q PONG; do
  >&2 echo "Redis is unavailable - sleeping"
  sleep 2
done

>&2 echo "Redis is up - executing command"
exec $cmd