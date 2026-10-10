const node = (tag, className, html) => {
    const element = document.createElement(tag)
    element.className = className
    if (html !== undefined) element.innerHTML = html
    return element
}
function link(url, label, className = '') {
    const a = node('a', className, label)
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'
    return a
}
export function buildPortfolioCards(datasets, biography, baseURL, sizes, onLayout) {
    return datasets.flatMap((dataset, group) => dataset.projects.map((project, position) => {
        const card = node('article', 'project_card')
        // Source ids are not unique across the two catalogs.
        card.id = `portfolio-${group}-${project.id}`
        card.dataset.projectId = project.id
        card.style.setProperty('--project-color', project.color)
        const black = node('div', 'card_black_area')
        card.append(black)
        black.append(node('div', 'card_vertical_stripe', `<div class="card_vertical_stripe_text">${project.alias}</div>`))
        const title = node('h2', 'card_title', project.name)
        black.append(title)
        if (project.content_id === '#content_bio') black.append(node('div', 'content', biography))
        const fields = [['text', ''], ['agency', 'Agency: '], ['client', 'Client: '], ['description', ''], ['role', 'Role: ']]
        for (const [key, label] of fields) if (project[key]) black.append(node('div', 'card_client', `<span>${label}</span>${project[key]}`))
        for (const [key, label] of [['awards', 'Awwward: '], ['fwa', 'FWA: '], ['codrops', 'Codrops: ']]) {
            if (!project[key]) continue
            const row = node('div', 'card_client', `<span>${label}</span>`)
            row.append(link(project[`${key}_url`], project[key])); black.append(row)
        }
        for (const [key, label] of [['visit_dev_url', 'Visit dev sandbox'], ['visit_dev_url2', 'Visit dev sandbox 2'], ['visit_url', 'Visit project']]) {
            if (!project[key]) continue
            const row = node('div', 'card_visit')
            row.append(link(project[key], `${label} <img alt="" class="external_icon" src="${new URL('assets/img/external_link.png', baseURL)}">`))
            black.append(row)
        }
        if (Array.isArray(project.tags) && project.tags.length) {
            const tags = node('div', 'card_tags')
            for (const id of project.tags) {
                const tag = dataset.tags.find(item => item.id === id)
                if (!tag) continue
                const span = node('span', 'card_tech_tag', tag.name)
                span.style.color = tag.text_color; span.style.backgroundColor = tag.bg_color
                tags.append(span, document.createTextNode(' '))
            }
            black.append(tags)
        }
        const mediaNode = (media, extra = false) => {
            if (media.type === 'YOUTUBE') {
                const container = node('div', 'youtube_container')
                const frame = node('iframe', 'youtube_video')
                frame.dataset.src = `https://www.youtube.com/embed/${encodeURIComponent(media.videoid)}`
                frame.title = `${title.textContent} — video`; frame.allowFullscreen = true
                frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                container.append(frame); return container
            }
            if (media.type !== 'IMG') return null
            const container = node('div', `card_media_item ${media.class || 'full_width_item'}`)
            const image = document.createElement('img')
            image.alt = title.textContent; image.decoding = 'async'
            image.loading = !extra && group === 0 && position < 3 ? 'eager' : 'lazy'
            const dimensions = sizes[media.path]
            if (dimensions) { image.width = dimensions[0]; image.height = dimensions[1] }
            image.src = new URL(media.path, baseURL).href
            image.addEventListener('load', onLayout)
            if (media.link) {
                const a = link(media.link, '')
                a.append(image)
                if (!extra) {
                    const icon = document.createElement('img')
                    icon.className = 'img_external_link'; icon.alt = ''
                    icon.src = new URL('assets/img/img_external_link.png', baseURL).href; a.append(icon)
                }
                container.append(a)
            } else container.append(image)
            return container
        }
        const main = node('div', 'card_main_media')
        for (const media of project.main_media || []) { const element = mediaNode(media); if (element) main.append(element) }
        if (main.children.length) black.append(main)
        let extra, button, loaded = false, animation
        if (project.extra_media?.length) {
            extra = node('div', 'card_extra_media'); extra.id = `${card.id}-extra`; extra.hidden = true
            button = node('button', 'card_more_info_bt', 'See more')
            button.type = 'button'; button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-controls', extra.id)
            const toggle = () => {
                const open = button.getAttribute('aria-expanded') !== 'true'
                if (!loaded) {
                    for (const media of project.extra_media) { const element = mediaNode(media, true); if (element) extra.append(element) }
                    loaded = true
                }
                const from = extra.hidden ? 0 : extra.getBoundingClientRect().height
                animation?.cancel(); extra.hidden = false; extra.inert = !open
                extra.querySelectorAll('iframe').forEach(frame => {
                    if (open) frame.src = frame.dataset.src
                    else frame.removeAttribute('src') // stop only this card's videos
                })
                const to = open ? extra.scrollHeight : 0
                button.setAttribute('aria-expanded', String(open)); button.textContent = open ? 'See less' : 'See more'
                const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
                animation = extra.animate([{ height: `${from}px`, opacity: open ? 0 : 1 }, { height: `${to}px`, opacity: open ? 1 : 0 }],
                    { duration: reduced ? 0 : 500, easing: 'cubic-bezier(.2,.7,.3,1)' })
                animation.onfinish = () => { extra.hidden = !open; onLayout() }
                onLayout()
            }
            card.addEventListener('click', event => {
                if (event.target.closest('a, iframe') || String(window.getSelection())) return
                toggle()
            })
            black.append(extra, button)
        }
        return { card, black, main: main.children.length ? main : null, project,
            dispose: () => animation?.cancel() }
    }))
}
