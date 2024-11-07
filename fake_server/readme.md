---
runme:
  id: 01JC1ZKD562A4901RDBZAN2EA7
  version: v3
---

This folder contains a test connect enpoint for work on splitting execution from serialzation - specifically to give us an endpoint to verify we can connect from the runme plugin's ConnectSerializer class.

Install deps, start the server:

```sh {"id":"01JC2EZZVAY7STA0RBY917JH61"}
# not sure why these install when done manually but error when collectively installed via package.json, but this flag makes it work here
npm i --legacy-peer-deps
npx tsx ./con_serv.ts

```

Leave the server running and test with `curl` in a new terminal.

```sh {"id":"01JC2FR2CTT9NA6P4P5KWCBRM4"}
# using jq to parse the json response, can omit if not desired
echo; curl -X POST \
-H "Content-Type: application/json" \
-H "Connect-Protocol-Version: 1" \
-d '{"notebook":{"cells":[{"kind":1,"value":"markdown data","languageId":"","metadata":{},"outputs":[]}],"metadata":{},"frontmatter":{"shell":"","cwd":"","skipPrompts":false,"category":"","terminalRows":"","tag":""}}}' \
http://localhost:8080/runme.parser.v1.ParserService/Serialize 2> /dev/null | jq -r ".result" | base64 -d ;echo;echo

```

Not sure how to modify the service to remove the `runme.parser.v1.ParserService` part but this works to serialize a very simple notebook structure

```sh {"id":"01JC2G0R166M5PKMD6T7N5ER9H"}
# and another test for Deserialize
echo; curl -X POST \
 -H "Content-Type: application/json" \
 -H "Connect-Protocol-Version: 1" \
 -d '{"source":"VGhlIG5vdGVib29rIGhhcyAxIGNlbGwocyk="}'\
 http://localhost:8080/runme.parser.v1.ParserService/Deserialize  ; echo;

```

```sh {"id":"01JC2GHY8CRCTH1H5MNJGF9FTH"}
# or run it with the provided test client in typescript
npx tsx ./client.ts
```

Open Questions:

? I see createPromiseClient is used to create a connection to agent but don't see this method being used by runme to connect to it's native grpc service.  Is this OK?
