import { describe, expect, it } from 'vitest'
import { toSource } from './to-source'

function sourceOf(html: string) {
  const root = document.createElement('div')
  root.innerHTML = html
  return toSource(root)
}

describe('toSource', () => {
  it('keeps decoded text', () => {
    expect(sourceOf('a &amp; b')).toBe('a & b')
  })

  it('drops spaces the page adds around the text', () => {
    expect(sourceOf('  hello  ')).toBe('hello')
    expect(sourceOf('\n  <b>a</b> \n <i>b</i>\n')).toBe('[b]a[/b] \n [i]b[/i]')
  })

  it('turns breaks into newlines', () => {
    expect(sourceOf('a<br>b')).toBe('a\nb')
    expect(sourceOf('a<br><br>b')).toBe('a\n\nb')
  })

  it('uses a smile code and a plain image address', () => {
    expect(sourceOf('<img class="smile" alt=":cool4:">')).toBe(':cool4:')
    expect(sourceOf('<img class="smile" alt=":(" src="https://spaces.im/i/sm/webp/smile.webp">')).toBe(':(')
    expect(sourceOf('<img class="emoji" alt=":smile:" src="https://spaces.im/i/em/20/1F604_2x.png">')).toBe(':smile:')
    expect(sourceOf('<img src="https://example/pic.jpg" alt="pic">')).toBe('https://example/pic.jpg')
  })

  it('wraps a quote and a link', () => {
    expect(sourceOf('<div class="quote">hi</div>')).toBe('[quote]hi[/quote]')
    expect(sourceOf('<a href="https://example/post" class="lh_160">Ссылка</a>')).toBe('[url=https://example/post]Ссылка[/url]')
  })

  it('keeps adjacent quotes on their own lines', () => {
    const html = '   <div class="quote mt_0">1</div><div class="quote">2</div><div class="quote">3</div>test    '
    expect(sourceOf(html)).toBe('[quote]1[/quote]\n\n[quote]2[/quote]\n\n[quote]3[/quote]\n\ntest')
  })

  it('keeps an explicit break between quotes', () => {
    expect(sourceOf('<div class="quote">1</div><br><div class="quote">2</div>')).toBe('[quote]1[/quote]\n[quote]2[/quote]')
    expect(sourceOf('<div class="quote">1</div><br><br><div class="quote">2</div>')).toBe('[quote]1[/quote]\n\n[quote]2[/quote]')
  })

  it('maps the inline tags', () => {
    expect(sourceOf('<b>a</b>')).toBe('[b]a[/b]')
    expect(sourceOf('<strong>a</strong>')).toBe('[b]a[/b]')
    expect(sourceOf('<i>a</i>')).toBe('[i]a[/i]')
    expect(sourceOf('<em>a</em>')).toBe('[i]a[/i]')
    expect(sourceOf('<u>a</u>')).toBe('[u]a[/u]')
    expect(sourceOf('<s>a</s>')).toBe('[s]a[/s]')
    expect(sourceOf('<strike>a</strike>')).toBe('[s]a[/s]')
    expect(sourceOf('<del>a</del>')).toBe('[s]a[/s]')
  })

  it('expands a short color and puts the background outside it', () => {
    expect(sourceOf('<span style="color:#F50">x</span>')).toBe('[color=#FF5500]x[/color]')
    expect(sourceOf('<span style="color:#ff5500">x</span>')).toBe('[color=#FF5500]x[/color]')
    expect(sourceOf('<span style="color:rgb(255, 85, 0)">x</span>')).toBe('[color=#FF5500]x[/color]')
    expect(sourceOf('<span style="color:rgba(255, 85, 0, 0.4)">x</span>')).toBe('[color=#FF5500]x[/color]')
    expect(sourceOf('<div style="background-color:#FFF;color:#323232">x</div>')).toBe('[fon=#FFFFFF]x[/fon]')
    expect(sourceOf('<span style="background:#ABC">x</span>')).toBe('[fon=#AABBCC]x[/fon]')
  })

  it('keeps the toolbar color names', () => {
    expect(sourceOf('<span style="color:green">x</span>')).toBe('[color=green]x[/color]')
    expect(sourceOf('<span style="color:GREEN">x</span>')).toBe('[color=green]x[/color]')
    expect(sourceOf('<span style="background-color:LightBlue">x</span>')).toBe('[fon=LightBlue]x[/fon]')
    expect(sourceOf('<span style="background-color:lightblue">x</span>')).toBe('[fon=LightBlue]x[/fon]')
  })

  it('does not read a background as a text color', () => {
    expect(sourceOf('<span style="background-color:#FFF">x</span>')).toBe('[fon=#FFFFFF]x[/fon]')
    expect(sourceOf('<span style="background: url(a.png)">x</span>')).toBe('x')
  })

  it('builds code tags from the language', () => {
    expect(sourceOf('<code class="code_tag">простой?</code>')).toBe('[code]простой?[/code]')
    expect(sourceOf('<code class="code_tag" data-lang="javascript"><!--  -->простой?<!-- --></code>')).toBe('[code=javascript]простой?[/code]')
  })

  it('builds a spoiler without turning its toggle into a link', () => {
    const html = '<span class="spo_all"><a href="https://example/?spoiler=1" class="splr_item"><span class="spo_desc">жми</span></a><div class="spo_text">секрет</div></span>'
    expect(sourceOf(html)).toBe('[spoiler=жми]секрет[/spoiler]')
    expect(sourceOf('<a href="https://example/?spoiler=1" class="splr_item">жми</a>')).toBe('жми')
  })

  it('trims the padding the page puts around a spoiler', () => {
    const html = '<span class="spo_all"><a href="" class="splr_item"><span class="spo_desc"> тайна </span></a><div class="spo_text"> секрет </div></span>'
    expect(sourceOf(html)).toBe('[spoiler=тайна]секрет[/spoiler]')
  })

  it('drops the gray the editor paints onto a background', () => {
    expect(sourceOf('<span style="color:#323232">x</span>')).toBe('[color=#323232]x[/color]')
    expect(sourceOf('<div style="background-color:#FFF59D;color:#323232"><span style="color:#3A474C">фон и цвет</span></div>')).toBe('[fon=#FFF59D][color=#3A474C]фон и цвет[/color][/fon]')
  })

  it('drops comments and unknown wrappers', () => {
    expect(sourceOf('a<!-- hide -->b')).toBe('ab')
    expect(sourceOf('<span class="whatever"><b>a</b></span>')).toBe('[b]a[/b]')
  })

  it('merges adjacent tags with the same color', () => {
    expect(sourceOf('<span style="color:#F00">a</span><span style="color:#F00">b</span>')).toBe('[color=#FF0000]ab[/color]')
    expect(sourceOf('<span style="color:#F50">a</span><span style="color:#FF5500">b</span>')).toBe('[color=#FF5500]ab[/color]')
    expect(sourceOf('<span style="color:#F00">a</span> <span style="color:#F00">b</span>')).toBe('[color=#FF0000]a[/color] [color=#FF0000]b[/color]')
    expect(sourceOf('<b style="color:#F00">a</b><b style="color:#F00">b</b>')).toBe('[b][color=#FF0000]ab[/color][/b]')
  })

  it('does not print an empty tag', () => {
    expect(sourceOf('<b></b>')).toBe('')
    expect(sourceOf('<b><i></i></b>x')).toBe('x')
  })

  it('rebuilds a short post', () => {
    const html = 'Первому <img class="smile" alt=":cool4:"><br><div class="quote">текст <a href="https://example/post" class="lh_160">Ссылка</a></div>'
    expect(sourceOf(html)).toBe('Первому :cool4:\n[quote]текст [url=https://example/post]Ссылка[/url][/quote]')
  })
})
