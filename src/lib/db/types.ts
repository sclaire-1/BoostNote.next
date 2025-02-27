import NoteDb from './NoteDb'
import { JsonObject, Except } from 'type-fest'

export type ObjectMap<T> = {
  [key: string]: T | undefined
}

/**
 * DB Types
 */

export type ExceptRev<D extends PouchDB.Core.RevisionIdMeta> = Except<D, '_rev'>

export interface NoteStorageData {
  id: string
  name: string
  cloudStorage?: {
    id: number
    name: string
  }
}

export type NoteDocEditibleProps = {
  title: string
  content: string
  folderPathname: string
  tags: string[]
  data: JsonObject
}

export type NoteDoc = {
  _id: string
  createdAt: string
  updatedAt: string
  trashed: boolean
  _rev: string
} & NoteDocEditibleProps

export type FolderDoc = {
  _id: string // folder:${FOLDER_PATHNAME}
  createdAt: string
  updatedAt: string
  _rev: string
} & FolderDocEditibleProps

export type FolderDocEditibleProps = {
  data: JsonObject
}

export type TagDoc = {
  _id: string // tag:${TAG_NAME}
  createdAt: string
  updatedAt: string
  data: JsonObject
  _rev: string
} & TagDocEditibleProps

export type TagDocEditibleProps = {
  data: JsonObject
}

export interface AllDocsMap {
  noteMap: ObjectMap<NoteDoc>
  folderMap: ObjectMap<FolderDoc>
  tagMap: ObjectMap<TagDoc>
}

/**
 * React state types
 */

export type NoteIdSet = Set<string>
export type NoteStorage = NoteStorageData &
  AllPopulatedDocsMap & {
    db: NoteDb
  }

export type PopulatedFolderDoc = FolderDoc & {
  pathname: string
  noteIdSet: NoteIdSet
}

export type PopulatedTagDoc = TagDoc & {
  name: string
  noteIdSet: NoteIdSet
}

export interface AllPopulatedDocsMap {
  noteMap: ObjectMap<NoteDoc>
  folderMap: ObjectMap<PopulatedFolderDoc>
  tagMap: ObjectMap<PopulatedTagDoc>
}
