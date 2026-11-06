#!/usr/bin/env bash
set -euo pipefail

notification_id="10000000-0000-4000-8000-000000000001"
token_id="20000000-0000-4000-8000-000000000099"

psql -v ON_ERROR_STOP=1 -c "INSERT INTO public.notification_push_token_deliveries(notification_id,fcm_token_id,status) VALUES ('$notification_id','$token_id','pending') ON CONFLICT (notification_id,fcm_token_id) DO UPDATE SET status='pending',dispatch_lease_until=NULL,lease_until=NULL;"

# Session A obtains the conditional UPDATE lock and deliberately holds its
# transaction open. Session B races while A owns the row lock.
psql -v ON_ERROR_STOP=1 -Atq -c "BEGIN; SELECT public.claim_notification_push_dispatch('$notification_id','$token_id',180); SELECT pg_sleep(2); COMMIT;" > /tmp/dispatch-claim-a.out &
pid=$!
sleep 0.25
second="$(psql -v ON_ERROR_STOP=1 -Atq -c "SELECT public.claim_notification_push_dispatch('$notification_id','$token_id',180);")"
wait "$pid"
first="$(grep -x 't' /tmp/dispatch-claim-a.out || true)"

if [[ "$first" != "t" ]]; then
  echo "Expected session A to win dispatch claim; got: $(cat /tmp/dispatch-claim-a.out)"
  exit 1
fi
if [[ "$second" != "f" ]]; then
  echo "Expected concurrent session B to lose dispatch claim; got: $second"
  exit 1
fi

echo "PASS concurrent dispatch claim: exactly one session acquired the lease"
