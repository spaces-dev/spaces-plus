import type { Feature } from '@/core/feature'
import { el } from '@zero-dependency/dom'
import { pluralize } from '@zero-dependency/utils'
import { setChecked, siteCheckbox } from '@/core/checkbox'
import { defineToggle } from '@/core/feature'
import { log } from '@/core/log'
import { modalConfirm } from '@/core/modals'
import { anchoredHref, siteApi, siteApiError, siteTabId } from '@/core/site'
import { withStyle } from '@/core/with-style'
import commentsCss from '@/styles/features/comments.scss?inline'
import { toggleId } from '@/types/toggles'
import {
  askingToSelectAll,
  eventElement,
  listButtonClass,
  okIcon,
  paintChooseAll,
  removeIcon,
  runDeleteQueue,
  warnNothingSelected,
  withIcon,
} from './batch-select'

const commentWord = (count: number) => pluralize(count)`комментари${['й', 'я', 'ев']}`
const commentsStyleId = 'SP_STYLE_COMMENTS'
const commentsToolsId = 'SP_PLUS_BUTTONS'
const commentBoxPrefix = 'DC_'
const commentsHeading = 'Комментарии'
const deleteLabel = 'Удалить'
const banLabel = 'Бан'
const deletePath = '/comment/delete/'
const banPath = '/forums/moder/ban/'
const boxSelector = `input[id^="${commentBoxPrefix}"]`

function commentRoot(node: Node) {
  const element = node instanceof Element ? node : node.parentElement
  return element?.closest<HTMLElement>('.js-comm') ?? null
}

const commentId = (root: Element) => root.getAttribute('data-id') ?? ''

const deleteLinkOf = (root: Element) => root.querySelector<HTMLAnchorElement>('a[data-action="comment_delete"]')

function queryOf(href: string) {
  const payload: Record<string, string> = {}
  const url = new URL(href, location.href)
  url.searchParams.forEach((value, key) => {
    payload[key] = value
  })
  return payload
}

function commentPayload(root: HTMLElement, href: string) {
  const payload: Record<string, unknown> = {
    ...queryOf(href),
    Comment_widget: 1,
    CK: null,
    hash: siteTabId(),
    Ch: true,
    Pag: false,
  }
  const list = root.closest<HTMLElement>('.js-comments_list')
  if (!list) return payload
  if (list.dataset.id) payload.Id = list.dataset.id
  if (list.dataset.type) payload.type = list.dataset.type
  const rootId = list.dataset.rootId || list.dataset.root_id
  if (rootId) payload.Root_id = rootId
  return payload
}

export const deleteComments: Feature = defineToggle({
  id: toggleId.comments,
  title: 'Пакетное удаление комментариев',
  description: 'Функция будет полезна тем, кто часто удаляет много комментариев. Работает там, где у вас есть возможность удалять комментарии: свой блог или гостевая.',
  start: withStyle(commentsStyleId, commentsCss, (ctx) => {
    const stop = ctx.onDom(() => {
      const heading = document.querySelector('h2.span')
      const dates = document.querySelectorAll<HTMLElement>('span.comment_date')
      const deleteLink = document.querySelector(anchoredHref(deletePath))
      const banLink = document.querySelector(anchoredHref(banPath))
      const onComments = heading?.textContent === commentsHeading
      const onDelete = deleteLink?.textContent === deleteLabel
      const onAdmin = banLink?.textContent === banLabel
      if (!dates.length || !onComments || (!onDelete && !onAdmin)) return

      for (const child of dates) {
        if (child.querySelector(boxSelector)) continue
        const root = commentRoot(child)
        const id = root ? commentId(root) : ''
        const menu = child.querySelector('a .ico_more')?.parentElement
        if (!root || !/^\d+$/.test(id) || !deleteLinkOf(root) || !(menu instanceof HTMLElement)) continue

        const box = siteCheckbox(`${commentBoxPrefix}${id}`, false)
        menu.after(box.label)
      }

      if (document.getElementById(commentsToolsId)) return
      const buttons = el('div', {
        className: 'widgets-group user__tools_last',
        id: commentsToolsId,
      })

      const chooseAll = el('button', {
        className: listButtonClass,
        innerHTML: withIcon(okIcon, 'Выбрать все'),
      })
      chooseAll.onclick = (event) => {
        const parent = eventElement(event)
        if (!parent) return
        const inputs = [...document.querySelectorAll<HTMLInputElement>(boxSelector)]
        const enable = askingToSelectAll(parent.innerHTML)
        for (const input of inputs) setChecked(input, enable)
        paintChooseAll(parent, enable)
      }

      const remove = el('button', {
        className: listButtonClass,
        innerHTML: withIcon(removeIcon, 'Удалить выбранные'),
      })
      remove.onclick = () => {
        const pending: Array<{ root: HTMLElement, href: string }> = []
        for (const input of document.querySelectorAll<HTMLInputElement>(boxSelector)) {
          if (!input.checked) continue
          const root = commentRoot(input)
          const link = root ? deleteLinkOf(root) : null
          if (root && link?.href) pending.push({ root, href: link.href })
        }

        if (!pending.length) {
          warnNothingSelected('комментарии, которые нужно удалить')
          return false
        }

        modalConfirm(`Вы действительно хотите удалить ${pending.length} ${commentWord(pending.length)}?`, true, async () => {
          await runDeleteQueue(pending, commentWord, async ({ root, href }) => {
            try {
              const result = await siteApi('comments.delete', commentPayload(root, href))
              if (Number(result.code) !== 0) {
                log.error('comments', siteApiError(result))
                return
              }
              root.remove()
              log.info('Удалил комментарий', commentId(root))
            } catch (error) {
              log.error('comments', error)
            }
          })
        })
        return false
      }

      buttons.append(remove, chooseAll)
      document.querySelector('div.js-comments-pgn')?.after(buttons)
    })
    return stop
  }),
})
