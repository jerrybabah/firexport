(async () => {
  initStyle()
  initLoader()

  const state = initState()

  if (state.isExporting) {
    return
  }

  try {
    state.isExporting = true

    /**
     * STEP1: 첫 번째 페이지로 이동
     */
    let isFirstPage = !checkMovableTo('prev')

    while (!isFirstPage) {
      await moveTo('prev')
      isFirstPage = !checkMovableTo('prev')

      await new Promise((resolve) => setTimeout(resolve, 10))
    }

    /**
     * STEP2: 페이지를 차례로 이동하며 데이터 뽑아내기
     */
    const totalEntities = []
    let isLastPageScraped = false

    while (!isLastPageScraped) {
      const entities = scrapTable()
      totalEntities.push(...entities)

      const isLastPage = !checkMovableTo('next')

      if (isLastPage) {
        isLastPageScraped = true

      } else {
        await moveTo('next')

        await new Promise((resolve) => setTimeout(resolve, 10))
      }
    }

    /**
     * STEP3: csv로 변환
     */
    const csv = entitiesToCsv(totalEntities)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `firexport_${Date.now()}.csv`

    a.click()

    URL.revokeObjectURL(url)

  } catch (e) {
    console.log(e)
    alert('fail to export')

  } finally {
    state.isExporting = false
  }
})()

function initStyle() {
  const alreadyStyle = document.getElementById('firexport-loader-style')

  if (alreadyStyle) {
    return
  }

  const style = document.createElement('style')
  style.id = 'firexport-loader-style'
  style.textContent = `
    #firexport-loader.active {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    }

    #firexport-loader.active .loader {
      width: 50px;
      aspect-ratio: 1;
      display:grid;
      -webkit-mask: conic-gradient(from 15deg,#0000,#000);
      animation: l26 1s infinite steps(12);
    }
    #firexport-loader.active .loader,
    #firexport-loader.active .loader:before,
    #firexport-loader.active .loader:after{
      background:
        radial-gradient(closest-side at 50% 12.5%,
        #f03355 96%,#0000) 50% 0/20% 80% repeat-y,
        radial-gradient(closest-side at 12.5% 50%,
        #f03355 96%,#0000) 0 50%/80% 20% repeat-x;
    }
    #firexport-loader.active .loader:before,
    #firexport-loader.active .loader:after {
      content: "";
      grid-area: 1/1;
      transform: rotate(30deg);
    }
    #firexport-loader.active .loader:after {
      transform: rotate(60deg);
    }

    @keyframes l26 {
      100% {transform:rotate(1turn)}
    }
  `;

  document.head.appendChild(style)
}

function initLoader() {
  const alreadyLoader = document.getElementById('firexport-loader')

  if (alreadyLoader) {
    return
  }

  const loaderContent = document.createElement('div')
  loaderContent.classList.add('loader')

  const loader = document.createElement('div')
  loader.id = 'firexport-loader'
  loader.appendChild(loaderContent)

  document.body.appendChild(loader)
}

function initState() {
  const loader = document.getElementById('firexport-loader')
  const isExporting = loader.classList.contains('active')

  const state = new Proxy(
    { isExporting },
    {
      set(target, prop, newValue) {
        if (prop !== 'isExporting') {
          target[prop] = newValue
          return true
        }

        if (typeof newValue !== 'boolean') {
          throw new Error('type error')
        }

        const loader = document.getElementById('firexport-loader')

        if (!loader) {
          throw new Error('initLoader required')
        }

        if (newValue) {
          loader.classList.add('active')
        } else {
          loader.classList.remove('active')
        }

        target[prop] = newValue
        return true
      }
    },
  )

  return state
}

function checkMovableTo(direction) {
  if (direction === 'prev') {
    const prevButton = document.querySelector('mat-paginator button[aria-label="Previous page"]')

    if (!prevButton) {
      throw new Error('no prev button')
    }

    const canPrev = prevButton.getAttribute('aria-disabled') !== 'true'
    return canPrev

  } else if (direction === 'next') {
    const nextButton = document.querySelector('mat-paginator button[aria-label="Next page"]')

    if (!nextButton) {
      throw new Error('no next button')
    }

    const canNext = nextButton.getAttribute('aria-disabled') !== 'true'
    return canNext

  } else {
    throw new Error(`unknown direction: ${direction}`)
  }
}

function moveTo(direction) {
  const movePromise = new Promise((resolve, reject) => {
    const observer = new MutationObserver((mutations) => {
      const childrenMutation = mutations.find((mutation) => mutation.type === 'childList')

      if (!childrenMutation) {
        return
      }

      resolve()
      observer.disconnect()
    })

    const tbody = document.querySelector('table tbody')
    observer.observe(tbody, { childList: true })

    const prevButton = document.querySelector('mat-paginator button[aria-label="Previous page"]')
    const nextButton = document.querySelector('mat-paginator button[aria-label="Next page"]')

    if (!prevButton || !nextButton) {
      reject(new Error('no navigation button'))
    }

    if (direction === 'prev') {
      prevButton.click()

    } else if (direction === 'next') {
      nextButton.click()

    } else {
      reject(new Error(`unknown direction: ${direction}`))
    }
  })

  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000))

  return Promise.race([movePromise, timeoutPromise])
}

function scrapTable() {
  const table = document.querySelector('table')

  if (!table) {
    throw new Error('no table')
  }

  const header = Array.from(table.querySelectorAll('th')).map(th => th.innerText.trim())
  const rows = Array.from(table.querySelectorAll('tbody tr'))

  const entities = rows.map((row) => {
    const cells = Array.from(row.querySelectorAll('td'))

    const entity = cells.reduce((prevEntity, cell, i) => {
      const key = header[i]

      const cellText = cell.innerText.trim()
      const value = convertStringToType(cellText)

      return {
        ...prevEntity,
        [key]: value,
      }
    }, {})

    return entity
  })

  return entities
}

function convertStringToType(string) {
  if (string === 'true' || string === 'false') {
    return string === 'true' // boolean

  } else if (string === 'null') {
    return null // null

  } else if (!isNaN(Number(string))) {
    return Number(string) // number

  } else if (string.startsWith('["') && string.endsWith('"]')) {
    return JSON.parse(string) // array

  } else if (string.startsWith('{') && string.endsWith('}')) {
    const jsonString = string.replace(/(\w+):/g, '"$1":')
    return JSON.parse(jsonString) // map

  } else if (string.includes('°')) {
    return string // geolocation (string representation)

  } else if (string.startsWith('/')) {
    return string // reference (string representation)

  } else if (string.includes('UTC')) {
    return string // datetime (string representation)

  } else {
    return string // string or id
  }
}

function entitiesToCsv(entities) {
  const header = Object.keys(entities[0]).map((key) => escape(key)).join(',')

  const body = entities.map((entity) => {
    return Object.values(entity).map((value) => {
      const valueStr = value === null
        ? 'null'
        : Array.isArray(value) || typeof value === 'object'
          ? JSON.stringify(value)
          : '' + value

      return escape(valueStr)
    }).join(',')
  }).join('\n')

  return `${header}\n${body}`
}

function escape(value) {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
}
