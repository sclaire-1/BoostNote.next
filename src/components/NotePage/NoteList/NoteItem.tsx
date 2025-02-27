import React, { useMemo } from 'react'
import { Link } from '../../../lib/router'
import styled from '../../../lib/styled/styled'
import { NoteDoc } from '../../../lib/db/types'
import Icon from '../../atoms/Icon'
import { mdiTagOutline } from '@mdi/js'
import {
  borderBottom,
  uiTextColor,
  secondaryBackgroundColor
} from '../../../lib/styled/styleFunctions'
import cc from 'classcat'

const StyledNoteListItem = styled.div`
  margin: 0;
  border-left: 2px solid transparent;
  ${uiTextColor}
  &.active,
  &:active,
  &:focus,
  &:hover {
    ${secondaryBackgroundColor}
  }
  &.active {
    border-left: 2px solid ${({ theme }) => theme.primaryColor};
  }
  user-select: none;
  ${borderBottom}

  transition: 200ms background-color;

  a {
    text-decoration: none;
  }

  .container {
    padding: 8px;
  }

  .title {
    font-weight: bold;
    font-size: 15px;
    margin-bottom: 4px;
  }

  .preview {
  }
`

type NoteItemProps = {
  note: NoteDoc
  active: boolean
  storageId: string
  basePathname: string
  focusList: () => void
}

export default ({ note, active, basePathname, focusList }: NoteItemProps) => {
  const href = `${basePathname}/${note._id}`

  const contentPreview = useMemo(() => {
    return (
      note.content
        .trim()
        .split('\n')
        .shift() || 'Empty note'
    )
  }, [note.content])

  return (
    <StyledNoteListItem className={cc([active && 'active'])}>
      <Link href={href} onFocus={focusList}>
        <div className='container'>
          <div className='title'>{note.title}</div>
          <div className='preview'>{contentPreview}</div>
          {note.tags.length > 0 && (
            <div>
              <Icon path={mdiTagOutline} />{' '}
              {note.tags.map(tag => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </StyledNoteListItem>
  )
}
