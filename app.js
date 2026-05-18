const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbx1n6HDvtriCGbXZXYCJW7eUMDkO9Uex3VRXMUPq_sNo_cRpQn5m5rT1p9cputdhAWQ/exec'

const scanBtn = document.getElementById('scanBtn')
const video = document.getElementById('video')
const statusText = document.getElementById('status')
const productArea = document.getElementById('productArea')

let codeReader = null
let currentStream = null

window.addEventListener('load', () => {
	console.log('app.js loaded')

	if (!scanBtn) {
		alert('scanBtnが見つかりません')
		return
	}

	if (!statusText) {
		alert('statusが見つかりません')
		return
	}

	statusText.textContent = '準備完了'
})

scanBtn.addEventListener('click', async () => {
	statusText.textContent = 'ボタンは反応しています'
	await startScanner()
})

async function startScanner() {
	try {
		statusText.textContent = 'カメラ起動中...'

		if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
			statusText.textContent = 'このブラウザはカメラに対応していません'
			return
		}

		if (!window.ZXingBrowser) {
			statusText.textContent = 'ZXingが読み込めていません'
			return
		}

		stopScanner()

		currentStream = await navigator.mediaDevices.getUserMedia({
			video: {
				facingMode: { ideal: 'environment' },
			},
			audio: false,
		})

		video.srcObject = currentStream
		await video.play()

		statusText.textContent = '読み取り中...'

		codeReader = new ZXingBrowser.BrowserMultiFormatReader()

		codeReader.decodeFromVideoElement(video, async (result, error) => {
			if (result) {
				const barcode = result.getText()

				statusText.textContent = `読み取り成功：${barcode}`

				stopScanner()

				await fetchProduct(barcode)
			}
		})
	} catch (error) {
		console.error(error)
		statusText.textContent = `エラー：${error.name} / ${error.message}`
	}
}

function stopScanner() {
	if (codeReader) {
		try {
			codeReader.reset()
		} catch (error) {
			console.log(error)
		}

		codeReader = null
	}

	if (currentStream) {
		currentStream.getTracks().forEach((track) => track.stop())
		currentStream = null
	}

	if (video) {
		video.srcObject = null
	}
}

async function startScanner() {
	try {
		statusText.textContent = 'カメラ起動中...'

		if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
			statusText.textContent = 'このブラウザはカメラに対応していません'
			return
		}

		if (!window.ZXingBrowser) {
			statusText.textContent = 'ZXingが読み込めていません'
			return
		}

		stopScanner()

		currentStream = await navigator.mediaDevices.getUserMedia({
			video: {
				facingMode: { ideal: 'environment' },
				width: { ideal: 1280 },
				height: { ideal: 720 },
			},
			audio: false,
		})

		video.srcObject = currentStream
		await video.play()

		statusText.textContent = '読み取り中... バーコードを中央に映してください'

		codeReader = new ZXingBrowser.BrowserMultiFormatReader()

		codeReader.decodeFromVideoElement(video, async (result, error) => {
			if (result) {
				const barcode = result.getText()

				statusText.textContent = `読み取り成功：${barcode}`

				stopScanner()

				await fetchProduct(barcode)
			}
		})
	} catch (error) {
		console.error(error)
		statusText.textContent = `エラー：${error.name} / ${error.message}`
	}
}

async function fetchProduct(barcode) {
	try {
		productArea.innerHTML = '<p>商品検索中...</p>'

		const url = `${GAS_API_URL}?action=getProduct&barcode=${encodeURIComponent(barcode)}`

		const res = await fetch(url)
		const product = await res.json()

		console.log(product)

		if (!product || product.error) {
			productArea.innerHTML = `
        <p>商品が見つかりません</p>
        <p>${barcode}</p>
      `
			return
		}

		productArea.innerHTML = `
      <h2>${product.name}</h2>
      <p class="price">${Number(product.price).toLocaleString()}円</p>
      <p>バーコード：${product.barcode}</p>
      <p>カテゴリ：${product.category || '-'}</p>
      <p>在庫：${product.stock || '-'}</p>
    `
	} catch (error) {
		console.error(error)

		productArea.innerHTML = `
      <p>商品取得エラー</p>
      <p>${error.message}</p>
    `
	}
}
