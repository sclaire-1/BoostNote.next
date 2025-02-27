import {
  AllDocsMap,
  FolderDoc,
  FolderDocEditibleProps,
  TagDocEditibleProps,
  TagDoc,
  NoteDoc,
  NoteDocEditibleProps,
  ExceptRev
} from './types'
import {
  getFolderId,
  createUnprocessableEntityError,
  isFolderPathnameValid,
  getParentFolderPathname,
  getTagId,
  isTagNameValid,
  generateNoteId,
  getNow,
  createNotFoundError,
  getFolderPathname,
  isNoteDoc,
  isFolderDoc,
  isTagDoc,
  getTagName,
  values
} from './utils'
import { FOLDER_ID_PREFIX } from './consts'

export default class NoteDb {
  public initialized = false

  constructor(
    public pouchDb: PouchDB.Database,
    public id: string,
    public name: string
  ) {}

  async init() {
    await this.upsertNoteListViews()

    const { noteMap, folderMap, tagMap } = await this.getAllDocsMap()
    const { missingPathnameSet, missingTagNameSet } = values(noteMap).reduce<{
      missingPathnameSet: Set<string>
      missingTagNameSet: Set<string>
    }>(
      (obj, noteDoc) => {
        if (noteDoc.trashed) {
          return obj
        }
        if (folderMap[noteDoc.folderPathname] == null) {
          obj.missingPathnameSet.add(noteDoc.folderPathname)
        }
        noteDoc.tags.forEach(tagName => {
          if (tagMap[tagName] == null) {
            obj.missingTagNameSet.add(tagName)
          }
        })
        return obj
      },
      { missingPathnameSet: new Set(), missingTagNameSet: new Set() }
    )

    await Promise.all([
      ...[...missingPathnameSet, '/'].map(pathname =>
        this.upsertFolder(pathname)
      ),
      ...[...missingTagNameSet].map(tagName => this.upsertTag(tagName))
    ])
  }

  async getFolder(path: string): Promise<FolderDoc | null> {
    return this.getDoc<FolderDoc>(getFolderId(path))
  }

  async upsertFolder(
    pathname: string,
    props?: Partial<FolderDocEditibleProps>
  ): Promise<FolderDoc> {
    if (!isFolderPathnameValid(pathname)) {
      throw createUnprocessableEntityError(
        `pathname is invalid, got \`${pathname}\``
      )
    }
    if (pathname !== '/') {
      await this.doesParentFolderExistOrCreate(pathname)
    }
    const folder = await this.getFolder(pathname)
    if (folder != null && props == null) {
      return folder
    }
    const now = getNow()
    const folderDocProps = {
      ...(folder || {
        _id: getFolderId(pathname),
        createdAt: now,
        data: {}
      }),
      ...props,
      updatedAt: now
    }
    const { rev } = await this.pouchDb.put(folderDocProps)

    return {
      _id: folderDocProps._id,
      createdAt: folderDocProps.createdAt,
      updatedAt: folderDocProps.updatedAt,
      data: folderDocProps.data,
      _rev: rev
    }
  }

  async doesParentFolderExistOrCreate(pathname: string) {
    const parentPathname = getParentFolderPathname(pathname)
    await this.upsertFolder(parentPathname)
  }

  async getAllDocsMap(): Promise<AllDocsMap> {
    const allDocsResponse = await this.pouchDb.allDocs({
      include_docs: true
    })

    const map: AllDocsMap = {
      noteMap: {},
      folderMap: {},
      tagMap: {}
    }

    return allDocsResponse.rows.reduce((map, row) => {
      const { doc } = row
      if (isNoteDoc(doc)) {
        map.noteMap[doc._id] = doc
      } else if (isFolderDoc(doc)) {
        map.folderMap[getFolderPathname(doc._id)] = doc
      } else if (isTagDoc(doc)) {
        map.tagMap[getTagName(doc._id)] = doc
      }
      return map
    }, map)
  }

  async getTag(tagName: string): Promise<TagDoc | null> {
    return this.getDoc<TagDoc>(getTagId(tagName))
  }

  async getDoc<T extends PouchDB.Core.GetMeta & PouchDB.Core.IdMeta>(
    docId: string
  ): Promise<T | null> {
    try {
      return await this.pouchDb.get<T>(docId)
    } catch (error) {
      switch (error.name) {
        case 'not_found':
          return null
        default:
          throw error
      }
    }
  }

  async upsertTag(tagName: string, props?: Partial<TagDocEditibleProps>) {
    if (!isTagNameValid(tagName)) {
      throw createUnprocessableEntityError(
        `tag name is invalid, got \`${tagName}\``
      )
    }

    const tag = await this.getTag(tagName)
    if (tag != null && props == null) {
      return tag
    }

    const now = getNow()
    const tagDocProps = {
      ...(tag || {
        _id: getTagId(tagName),
        createdAt: now,
        data: {}
      }),
      ...props,
      updatedAt: now
    }
    const { rev } = await this.pouchDb.put(tagDocProps)

    return {
      _id: tagDocProps._id,
      createdAt: tagDocProps.createdAt,
      updatedAt: tagDocProps.updatedAt,
      data: tagDocProps.data,
      _rev: rev
    }
  }

  async getNote(noteId: string): Promise<NoteDoc | null> {
    return this.getDoc<NoteDoc>(noteId)
  }

  async createNote(
    noteProps: Partial<NoteDocEditibleProps> = {}
  ): Promise<NoteDoc> {
    const now = getNow()
    const noteDocProps: ExceptRev<NoteDoc> = {
      _id: generateNoteId(),
      title: 'Untitled',
      content: '',
      tags: [],
      folderPathname: '/',
      data: {},
      ...noteProps,
      createdAt: now,
      updatedAt: now,
      trashed: false
    }

    await this.upsertFolder(noteDocProps.folderPathname)
    await Promise.all(noteDocProps.tags.map(tagName => this.upsertTag(tagName)))

    const { rev } = await this.pouchDb.put(noteDocProps)

    return {
      ...noteDocProps,
      _rev: rev
    }
  }

  async updateNote(noteId: string, noteProps: Partial<NoteDocEditibleProps>) {
    const note = await this.getNote(noteId)
    if (note == null)
      throw createNotFoundError(`The note \`${noteId}\` does not exist`)

    if (noteProps.folderPathname) {
      await this.upsertFolder(noteProps.folderPathname)
    }
    if (noteProps.tags) {
      await Promise.all(noteProps.tags.map(tagName => this.upsertTag(tagName)))
    }

    const now = getNow()
    const noteDocProps = {
      ...note,
      ...noteProps,
      updatedAt: now
    }
    const { rev } = await this.pouchDb.put<NoteDoc>(noteDocProps)

    return {
      ...noteDocProps,
      _rev: rev
    }
  }

  async findNotesByFolder(folderPathname: string): Promise<NoteDoc[]> {
    const { rows } = await this.pouchDb.query<NoteDoc>('notes/by_folder', {
      key: folderPathname,
      include_docs: true
    })

    return rows.map(row => row.doc!)
  }

  async findNotesByTag(tagName: string): Promise<NoteDoc[]> {
    const { rows } = await this.pouchDb.query<NoteDoc>('notes/by_tag', {
      key: tagName,
      include_docs: true
    })

    return rows.map(row => row.doc!)
  }

  async upsertNoteListViews() {
    const ddoc = await this.getDoc<
      {
        views: { [key: string]: { map: string } }
      } & PouchDB.Core.GetMeta &
        PouchDB.Core.IdMeta
    >('_design/notes')
    const byFolderMap = `function(doc) {
      if (doc._id.startsWith('note:')) {
        emit(doc.folderPathname)
      }
    }`
    const byTagMap = `function(doc) {
      if (doc._id.startsWith('note:')) {
        doc.tags.forEach(tag => emit(tag))
      }
    }`
    if (ddoc != null) {
      if (
        ddoc.views.by_folder.map === byFolderMap &&
        ddoc.views.by_tag.map === byTagMap
      ) {
        return ddoc
      }
    }

    return this.pouchDb.put({
      ...(ddoc || {
        _id: '_design/notes'
      }),
      views: {
        by_folder: {
          map: byFolderMap
        },
        by_tag: {
          map: byTagMap
        }
      }
    })
  }

  async trashNote(noteId: string): Promise<NoteDoc> {
    const note = await this.getNote(noteId)
    if (note == null)
      throw createNotFoundError(`The note \`${noteId}\` does not exist`)

    const noteDocProps = {
      ...note,
      trashed: true
    }
    const { rev } = await this.pouchDb.put<NoteDoc>(noteDocProps)

    return {
      ...noteDocProps,
      _rev: rev
    }
  }

  async untrashNote(noteId: string): Promise<NoteDoc> {
    const note = await this.getNote(noteId)
    if (note == null)
      throw createNotFoundError(`The note \`${noteId}\` does not exist`)

    await this.upsertFolder(note.folderPathname)

    await Promise.all(
      note.tags.map(tag => {
        this.upsertTag(tag)
      })
    )

    const noteDocProps = {
      ...note,
      trashed: false
    }
    const { rev } = await this.pouchDb.put<NoteDoc>(noteDocProps)

    return {
      ...noteDocProps,
      _rev: rev
    }
  }

  async purgeNote(noteId: string): Promise<void> {
    const note = await this.getNote(noteId)
    if (note == null)
      throw createNotFoundError(`The note \`${noteId}\` does not exist`)

    await this.pouchDb.remove(note)
  }

  async removeTag(tagName: string): Promise<void> {
    const notes = await this.findNotesByTag(tagName)
    await Promise.all(
      notes.map(note => {
        return this.updateNote(note._id, {
          tags: note.tags.filter(tag => tag !== tagName)
        })
      })
    )

    const tag = await this.getTag(tagName)
    if (tag != null) {
      this.pouchDb.remove(tag)
    }
  }

  async removeFolder(folderPathname: string): Promise<void> {
    const foldersToDelete = await this.getAllFolderUnderPathname(folderPathname)

    await Promise.all(
      foldersToDelete.map(folder =>
        this.trashAllNotesInFolder(getFolderPathname(folder._id))
      )
    )

    await Promise.all(
      foldersToDelete.map(folder => this.pouchDb.remove(folder))
    )
  }

  async getAllFolderUnderPathname(
    folderPathname: string
  ): Promise<FolderDoc[]> {
    const [folder, { rows }] = await Promise.all([
      this.getFolder(folderPathname),
      this.pouchDb.allDocs<FolderDoc>({
        startkey: `${getFolderId(folderPathname)}/`,
        endkey: `${getFolderId(folderPathname)}/\ufff0`,
        include_docs: true
      })
    ])
    const folderList = rows.map(row => row.doc!)
    if (folder != null) {
      folderList.unshift(folder)
    }

    return folderList
  }

  async trashAllNotesInFolder(folderPathname: string): Promise<void> {
    const notes = await this.findNotesByFolder(folderPathname)

    await Promise.all(
      notes.filter(note => !note.trashed).map(note => this.trashNote(note._id))
    )
  }

  async getAllFolders(): Promise<FolderDoc[]> {
    const allDocsResponse = await this.pouchDb.allDocs<FolderDoc>({
      startkey: `${FOLDER_ID_PREFIX}/`,
      endkey: `${FOLDER_ID_PREFIX}/\ufff0`,
      include_docs: true
    })
    return allDocsResponse.rows.map(row => row.doc!)
  }

  async getFoldersByPathnames(pathnames: string[]): Promise<FolderDoc[]> {
    const allDocsResponse = await this.pouchDb.allDocs<FolderDoc>({
      keys: pathnames.map(pathname => getFolderId(pathname)),
      include_docs: true
    })
    return allDocsResponse.rows.map(row => row.doc!)
  }
}
