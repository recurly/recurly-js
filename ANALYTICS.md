Analytics endpoints
====

# Purpose

To collect data about various events that occur during a customer's interaction
with recurly.js, from card entry, to error occurrences, abandonment, tokenization,
with understanding of customer interaction timeframes, dropoffs, and funnel behaviors

# POST /js/v1/event

```
Class RecurlyJsEvent

{
  category: 'user', // 'merchant', 'recurly'
  action: 'tokenize-start',
  customerId: 'abc123',
  sessionId: 'xyz789',
  url: 'https://merchant.com/checkout',
  initiatedAt: '2018-03-12T19:01:51.511Z', // exact time the event occurred in the browser, UTC
  meta: {
    method: 'recurly.token',
    value: '', // in case of some value being conveyed i.e. during pricing
    // arbitrary: 'values'
    // ...
  }
}
```

## Data applied by headers

{
  userAgent: 'Mozilla/5.0 ...',
  receivedAt: '2018-03-12T19:01:51.975Z', // time at which the event was received
  remoteIP: '0.0.0.0'
}

# Logging services

1. Splunk
2. [Google Analytics Measurement Protocol]
  1. https://developers.google.com/analytics/devguides/collection/protocol/v1/devguide

# Client requirements

1. recurly.event method
2. localStorage.recurly.customerId: uuid generated per customer, stored indefinitely
3. localStorage.recurly.sessionId: uuid generated per customer, stored short-term, TTL 1h
4. recurly.event calls: tbd by org requirements

# Tasks

1. Create /js/v1/event endpoint, RecurlyJsEvent, and Splunk logging routine
2. Create client customer and session id
3. Create client event method
4. Create events
  1. tokenization
  2. hosted field interaction: value entry, focus, blur. Each with field state conveyed
  3. pricing manipulations: plan choice, coupon entry, etc
  4. user error occurrences
  5. runtime error occurrences
  6. [further scope and number tbd by org requirements]

# Remaining discovery

1. Assess initial org requirements/asks from marketing, sales, product, engineering. This blocks task 4.6
2. Assess merchant impact of customer data collection. Are we limited by our ToS or implicit recurly-merchant relationship ethics on what customer actions and data we should collect?
