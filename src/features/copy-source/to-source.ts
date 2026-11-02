import { isAttach } from './attaches'
import { colorChoice, colorToken } from './color'
import { mentionText } from './mentions'

interface TextPiece {
  type: 'text'
  value: string
}

interface TagPiece {
  type: 'tag'
  name: string
  param: string
  children: Piece[]
}

type Piece = TextPiece | TagPiece

interface Wrap {
  name: string
  param: string
}

const skippedTags = new Set(['script', 'style'])
const injectedOnBackground = '#323232'

let postedNights = new Map<string, string>()

function inlineName(tag: string) {
  if (tag === 'b' || tag === 'strong') return 'b'
  if (tag === 'i' || tag === 'em') return 'i'
  if (tag === 'u') return 'u'
  if (tag === 's' || tag === 'strike' || tag === 'del') return 's'
  return ''
}

function styleMap(style: string) {
  const map = new Map<string, string>()
  for (const part of style.split(';')) {
    const index = part.indexOf(':')
    if (index < 0) continue
    const key = part.slice(0, index).trim().toLowerCase()
    const value = part.slice(index + 1).trim()
    if (key) map.set(key, value)
  }
  return map
}

function renderChildren(node: ParentNode): Piece[] {
  const pieces: Piece[] = []
  for (const child of node.childNodes) pieces.push(...renderNode(child))
  return pieces
}

function wrapped(children: Piece[], wraps: Wrap[]): Piece[] {
  let current = children
  for (const wrap of wraps) {
    current = [{
      type: 'tag',
      name: wrap.name,
      param: wrap.param,
      children: current,
    }]
  }
  return current
}

function trimEdges(pieces: Piece[]) {
  const next = pieces.map((piece) => {
    if (piece.type !== 'text') return piece
    return { ...piece }
  })
  const first = next[0]
  if (first?.type === 'text') first.value = first.value.trimStart()
  const last = next.at(-1)
  if (last?.type === 'text') last.value = last.value.trimEnd()
  return next.filter(piece => piece.type !== 'text' || piece.value)
}

function spoilerPiece(element: HTMLElement): Piece[] {
  const label = element.querySelector('.spo_desc')?.textContent?.trim() ?? ''
  const body = element.querySelector('.spo_text')
  return [{
    type: 'tag',
    name: 'spoiler',
    param: label,
    children: body ? trimEdges(renderChildren(body)) : [],
  }]
}

function imagePiece(element: HTMLElement): Piece[] {
  const coded = element.classList.contains('smile') || element.classList.contains('emoji')
  const value = coded
    ? element.getAttribute('alt') ?? ''
    : element.getAttribute('src') ?? ''
  return value ? [{ type: 'text', value }] : []
}

function readPostedNights() {
  const rules = new Map<string, string>()
  const nightRule = /\.t-([\da-f]{6})\s*\{[^}]*?(?<!-)color:\s*(#[\da-f]{6})/gi
  for (const style of document.querySelectorAll('style')) {
    const text = style.textContent ?? ''
    for (const match of text.matchAll(nightRule)) {
      const name = match[1]?.toLowerCase()
      const hex = match[2]
      if (!hex) continue
      const color = colorToken(hex)
      if (name && color) rules.set(name, color)
    }
  }
  return rules
}

function postedNight(element: HTMLElement) {
  const name = [...element.classList].find(cls => /^t-[\da-f]{6}$/i.test(cls))
  if (!name) return ''
  return postedNights.get(name.slice(2).toLowerCase()) ?? ''
}

function textColor(element: HTMLElement, authored: string | undefined) {
  const token = colorToken(authored)
  if (!token || !token.startsWith('#') || !element.isConnected) return token
  const seen = postedNight(element) || colorToken(getComputedStyle(element).color)
  if (!seen) return token
  return colorChoice(token, seen)
}

function wrapsFor(element: HTMLElement): Wrap[] {
  const tag = element.tagName.toLowerCase()
  const styles = styleMap(element.getAttribute('style') ?? '')
  const wraps: Wrap[] = []
  const color = textColor(element, styles.get('color'))
  const background = colorToken(styles.get('background-color'))
    || colorToken(styles.get('background'))
  const inline = inlineName(tag)
  const href = element.getAttribute('href') ?? ''
  const lang = element.getAttribute('data-lang')?.trim() ?? ''

  if (color && !(background && color === injectedOnBackground)) {
    wraps.push({ name: 'color', param: color })
  }

  if (inline) {
    wraps.push({ name: inline, param: '' })
  }

  if (element.classList.contains('quote')) {
    wraps.push({ name: 'quote', param: '' })
  }

  if (tag === 'a' && href && !element.classList.contains('splr_item')) {
    wraps.push({ name: 'url', param: href })
  }

  if (element.classList.contains('code_tag')) {
    wraps.push({ name: 'code', param: lang })
  }

  if (background) {
    wraps.push({ name: 'fon', param: background })
  }

  return wraps
}

function renderElement(element: HTMLElement): Piece[] {
  const tag = element.tagName.toLowerCase()
  if (skippedTags.has(tag)) return []
  if (element.classList.contains('spo_all')) return spoilerPiece(element)
  if (isAttach(element)) return []
  if (tag === 'br') return [{ type: 'text', value: '\n' }]
  if (tag === 'img') return imagePiece(element)
  const mention = mentionText(element)
  if (mention) return [{ type: 'text', value: mention }]
  return wrapped(renderChildren(element), wrapsFor(element))
}

function renderNode(node: Node): Piece[] {
  if (node instanceof Text) {
    return node.data ? [{ type: 'text', value: node.data }] : []
  }
  if (!(node instanceof HTMLElement)) return []
  return renderElement(node)
}

const quoteBreak = '\n\n'

function isQuote(piece: Piece): piece is TagPiece {
  return piece.type === 'tag' && piece.name === 'quote'
}

function hasBreak(piece: Piece, edge: 'start' | 'end') {
  if (piece.type !== 'text') return false
  return edge === 'start' ? piece.value.startsWith('\n') : piece.value.endsWith('\n')
}

function separateQuotes(pieces: Piece[]): Piece[] {
  const ready = pieces.map((piece) => {
    if (piece.type !== 'tag') return piece
    return { ...piece, children: separateQuotes(piece.children) }
  })
  const separated: Piece[] = []
  for (const piece of ready) {
    const prev = separated.at(-1)
    const needsBreak = prev && (
      (isQuote(prev) && !hasBreak(piece, 'start'))
      || (isQuote(piece) && !hasBreak(prev, 'end'))
    )
    if (needsBreak) separated.push({ type: 'text', value: quoteBreak })
    separated.push(piece)
  }
  return separated
}

function mergePieces(pieces: Piece[]): Piece[] {
  const ready = pieces.map((piece) => {
    if (piece.type !== 'tag') return piece
    return { ...piece, children: mergePieces(piece.children) }
  })
  const folded: Piece[] = []
  for (const piece of ready) {
    const prev = folded.at(-1)
    if (prev?.type === 'text' && piece.type === 'text') {
      prev.value += piece.value
      continue
    }
    if (
      prev?.type === 'tag'
      && piece.type === 'tag'
      && prev.name === piece.name
      && prev.param === piece.param
      && prev.name !== 'quote'
    ) {
      prev.children = mergePieces([...prev.children, ...piece.children])
      continue
    }
    folded.push(piece)
  }
  return folded
}

function serialize(pieces: Piece[]): string {
  let out = ''
  for (const piece of pieces) {
    if (piece.type === 'text') {
      out += piece.value
      continue
    }
    const inner = serialize(piece.children)
    if (!inner) continue
    const open = piece.param ? `[${piece.name}=${piece.param}]` : `[${piece.name}]`
    out += `${open}${inner}[/${piece.name}]`
  }
  return out
}

export function toSource(root: ParentNode) {
  postedNights = readPostedNights()
  return serialize(mergePieces(separateQuotes(renderChildren(root)))).trim()
}
