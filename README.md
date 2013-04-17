# OpenQ

OpenQ is an attempt at a simple Open Message Queueing system, which standardises on the JSON format and a few basic REST endpoints. 

The OpenQ Server library is a reference implementation written in TypeScript for [NodeJS](http://nodejs.org). 

The ultimate goal of this project is to create an extremely simple but flexible standard for messaging, that anyone can use in their applications.

## Introduction

OpenQ mandates the support of a small list of message types. For a server to be OpenQ compliant it MUST be able to handle all message types outlined below unless otherwise specified.

In OpenQ a username represents a sender and/or recipient in the system. The user may give multiple applications access to their their OpenQ service and how this is authenticated is left open to application developers. In the reference implementation authentication is via HTTP BASIC auth username/password mandated to be over HTTPS.
Messages can only posted to another user's inbox with a subscription token issued by that User's OpenQ server. Subscriptions can be either set up by the user wanting to receive messages or requested by the sender, but the sender can only send one subscription request.

## Endpoints

An OpenQ server hosts one or more authenticated Users. 

Each user has two endpoints, an **inbox** and an **outbox** for messages. 

- The User's inbox can only be read by the owning User.
- The User's inbox can only be written to by either the authenticated owning User, or external parties that have been issued a Subscription token by the owner.
- The User's outbox can be read by anyone.
- The User's outbox can be written to only by the owning User.

When reading an inbox or outbox an OpenQ server MUST guarantee the sequence of messages of the same "type". Messages of different types are not guaranteed to be returned in a consistent sequence.

## Messages

A message in OpenQ can have any content you like as long as it adheres to the following constraints.

- The message MUST be valid JSON.
- The FIRST parameter MUST be a "type" string which is neither null or empty.
- The entire message MUST be less than [65KiB](http://en.wikipedia.org/wiki/Kibibyte). 

## Reserved OpenQ Message Types

### Success message

This is a success message that always accompanies a HTTP 200 response from an OpenQ server.

### Response body:
<pre>
{ 
  "type":"urn:openq/success"
}
</pre>

|Name|Type|Description|
|:---|:---------|:----------|
|type|string|URI that identifies this as a success message|

### Failed message

This is a failure message that always accompanies a HTTP 4xx response from an OpenQ server.

### Response body:
<pre>
{ 
  "type":"urn:openq/failed",
  "errorcode":"InboxNotFound",
  "error":"The specified inbox does not exist"
}
</pre>

|Name|Type|Description|
|:---|:---------|:----------|
|type|string|URI that identifies this as a failed message|
|errorcode|string|An error code that allows the client to determine the cause of the error in code|
|error|string|Human readable message describing why the response failed|


### Subscribe Message

Subscribe messages inform the server that messages of the specified types are to be routed to the inbox of the caller's request. 
It is the discretion of the recipient server whether this subscription is allowed or not and whether authentication is required.

* The server MUST post a Verify Token message to the specified inbox url to ensure the token permits posting to the inbox and receives a HTTP 200 and **Success** response message from that server, otherwise the server MUST respond with a **Failed** message and HTTP 400.
* The server MUST respond with either a HTTP 200 and a **Success** response message OR a HTTP 4xx and a **Failed** response message.

HTTP POST: https://server.com/username/inbox

#### Request body:
<pre>
{
  "type":"urn:openq/subscribe",
  "inbox":"https://callingserver.com/username/inbox",
  "token":"bfsgetwg443td4dgoh43fsldjfdk==",
  "messagetypes":["urn:twitter/tweet", "urn:facebook/statusupdate"],
  "messagesperminute":60,
  "fromfirstmessage":true
}
</pre>

|Name|Type|Description|
|:---|:---------|:----------|
|type|string|URI that identifies this as a subscribe message|
|inbox|string|The universally addressable url to the inbox that messages are to be forwarded to. This combined with the token, uniquely identifies the subscription|
|token|string|Issued by the subscriber, this token tells the server what token to use when posting a message to the subscriber's inbox|
|messagetypes|string[]|The list of message types to subscribe to (this is an additive operation, if there are already subscriptions for a given inbox this will add to the pre-existing list of subscribed message types|
|messagesperminute|number|Specifies the maximum number of messages per minute the subscriber can handle, the server MUST honor this constraint when pushing new messages to the subscribers inbox|
|fromfirstmessage|boolean|A value indicating whether the subscription should start from the oldest message the OpenQ server has of these types, or should only subscribe to any new messages posted after the subscription is created|

#### Response body:
**Success** OR **Failed** response message

> Note: If the token given does not grant permission to post to that inbox the server may reject the subscription request immediately. If at a later date the token is no longer valid, the subscription MAY be automatically unsubscribed by the server.


### Unsubscribe Message
Unsubscribe messages inform the receiving server that messages of the specified message types are no longer to be routed to the inbox of the calling server. 

-  The server MUST acknowldege the message with either a HTTP 200 and a **Success** message OR rejected with a HTTP 4xx and a **Failed** message.


HTTP POST: https://receivingserver.com/username/inbox
#### Request body:
<pre>
{ 
  "type":"urn:openq/unsubscribe",
  "inbox":"https://callingserver.com/username/inbox",
  "messagetypes":["urn:twitter/tweet", "urn:facebook/statusupdate"]
}
</pre>

|Name|Type|Description|
|:---|:---------|:----------|
|type|string|URI that identifies this as an unsubscribe message|
|inbox|string|The inbox to unsubscribe|
|token|string|The token which must match the previously issued token from the subscriber.|

#### Response body:
**Success** OR **Failed** response message


### Request Subscribe Message

This message is the only message type that can be posted to a user's inbox without authentication.
It is the equivalent of a "Request permission to send these message types to you" message. Basically asking that the recipient subscribe to the sender's messages of particular types (A "please follow me request" if you will).

* The server MUST only accept one of these messages for any given return inbox and MUST reject all subsequent messages from that peer with an HTTP 4xx until a Subscription for that inbox is setup. 
* The server MUST either accept this message (not the request itself) with a HTTP 200 response, OR reject with 4xx response immediately. 

It is then at the server's discretion as to whether future Subscribe Requests from that peer will be accepted or rejected immediately.

HTTP POST: https://server.com/username/inbox

Request body:
<pre>
{ 
  "type":"urn:openq/requestsubscribe",
  "inbox":"https://subscribetoserver.com/subscribetousername/inbox",
  "token":"bfsgetwg443td4dgoh43fsldjfdk==",
  "messagetypes":["urn:twitter/tweet", "urn:facebook/statusupdate"],
  "fromfirstmessage":true
}
</pre>

Response body:
**Success** OR **Failed** response message


## All other Message handling

### Broadcasting a Message to all Subscribers

Any message can be broadcast to all Subscribers by posting to the outbox.
A broadcast message can only be sent by the authenticated user on an OpenQ server to their own outbox. All subscribers to this outbox will then receive 1 copy of the message either pushed to their inbox directly, or they can poll for it at a later date (depending on if there is a subscription).

HTTP POST: https://server.com/username/outbox

Request body:
<pre>
{ 
    "type":"urn:twitter/tweet",
    "token":"absdfoweighiueghkigwe==",
    "message":{ tweet:"OMG! OpenQ rocks!"}
}
</pre>

Response body:
**Success** OR **Failed** response message

> Note: The server MUST authenticate the sender is the owner user but MAY do so any number of ways (Basic auth, signature, bearer token etc.)

### Post a Message to a Subscriber (Any message type to another user's inbox)

When a message is to be sent to a user.

* The client MUST specify a valid message (see above).
* The client MUST specify the subscription token they were previously issued by the recipient or be authenticated as the owner of that inbox.

HTTP POST: https://server.com/username/inbox
#### Request Body:
<pre>
{ 
    "type":"urn:twitter/tweet",
    "token":"absdfoweighiueghkigwe==",
    "tweet":"OMG! OpenQ rocks!"
}
</pre>

### Polling an outbox for Messages 

HTTP GET: https://server.com/username/outbox/?take=100&skip=900&type=urn:twitter/tweet

#### Response Body:
<pre>
{ 
  "count": 9000,
  "from":0,
  "messages":[{
      "type":"urn:twitter/tweet",
      "tweet":"Woot! First tweet"
    }, {
      "type":"urn:twitter/tweet",
      "tweet":"Dude! I just twoted all over the place!"
    } 
  ]
}
</pre>


### User polling for Private Inbox Messages 

HTTP GET: https://server.com/username/inbox/take=100&skip=0
auth-token:username:password
Response:
<pre>
{ 
  "count": 9000,
  "from":0,
  "messages":[{
    "type":"http://www.msnbc.com/rss.xml",
    "summary":"Lol catz speak out about Anonymous"
   }]
}
</pre>


## Examples

### Scenario 1: RSS Aggregator

FeedSharkly is a company that hosts an RSS aggregator and providers a mobile phone app for their users to read feeds.

FeedSharkly service periodically refreshes RSS feeds on behalf of a user and delivers the articles to their mobile.

When a user (in this case FrankyJ) pushes the subscribe link to an RSS feed in the mobile client, the mobile client app posts a subscribe message to the aggregator service's inbox.

HTTP POST: https://openq.feedsharkly.com/aggregator/outbox
<pre>
{ 
  "type":"urn:openq/subscribe",
  "token":"1234",
  "inbox":"https://openq.feedsharkly.com/FrankyJ/inbox",
  "messagetypes":["http://www.msnbc.com/rss.xml"]
}
</pre>

The service later posts a broadcast message with the RSS content to it's service outbox.

HTTP POST: https://openq.feedsharkly.com/aggregator/outbox
<pre>
{ 
    "type":"http://www.msnbc.com/rss.xml",
    "summary":"Lol catz speak out about Anonymous"
}
</pre>

The mobile client can then periodically check it's inbox for news feeds.

HTTP GET: https://openq.feedsharkly.com/FrankyJ/inbox?take=100&skip=0

Response:
<pre>
{ 
  "count": 9000,
  "from":0,
  "messages":[{
    "type":"http://www.msnbc.com/rss.xml",
    "summary":"Lol catz speak out about Anonymous"
   }]
}
</pre>

The license for this is MIT.

Andrew Chisholm