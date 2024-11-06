// @generated by protoc-gen-connect-es v1.6.1 with parameter "target=ts"
// @generated from file service.proto (package runme.parser.v1, syntax proto3)
/* eslint-disable */
// @ts-nocheck

import { MethodKind } from '@bufbuild/protobuf';

import { DeserializeRequest, DeserializeResponse, SerializeRequest, SerializeResponse } from './service_pb.js';


/**
 * @generated from service runme.parser.v1.ParserService
 */
export const ParserService = {
  typeName: 'runme.parser.v1.ParserService',
  methods: {
    /**
     * @generated from rpc runme.parser.v1.ParserService.Deserialize
     */
    deserialize: {
      name: 'Deserialize',
      I: DeserializeRequest,
      O: DeserializeResponse,
      kind: MethodKind.Unary,
    },
    /**
     * @generated from rpc runme.parser.v1.ParserService.Serialize
     */
    serialize: {
      name: 'Serialize',
      I: SerializeRequest,
      O: SerializeResponse,
      kind: MethodKind.Unary,
    },
  }
} as const

