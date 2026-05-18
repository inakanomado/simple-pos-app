const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbx1n6HDvtriCGbXZXYCJW7eUMDkO9Uex3VRXMUPq_sNo_cRpQn5m5rT1p9cputdhAWQ/exec'

const gasTestBtn = document.getElementById('gasTestBtn')
const scanBtn = document.getElementById('scanBtn')
const stopBtn = document.getElementById('stopBtn')
const video = document.getElementById('video')
const statusText = document.getElementById('status')
const productArea = document.getElementById('productArea')
const manualBarcode = document.getElementById('manualBarcode')
const manualSearchBtn = document.getElementById('manualSearchBtn')

let codeReader = null
let currentStream = null
let scanLoopId = null
let isScanning = false

window.addEventListener('load', () => {
	statusText.textContent = '準備完了'
})

gasTestBtn.addEventListener('click', async () => {
	await testGasConnection()
})

scanBtn.addEventListener('click', async () => {
	await startScanner()
})

stopBtn.addEventListener('click', () => {
	stopScanner()
	statusText.textContent = 'カメラを停止しました'
})

manualSearchBtn.addEventListener('click', async () => {
	const barcode = manualBarcode.value.trim()

	if (!barcode) {
		statusText.textContent = 'バーコード番号を入力してください'
		return
	}

	statusText.textContent = `手入力検索：${barcode}`
	await fetchProduct(barcode)
})

async function startScanner() {
	stopScanner()

	if ('BarcodeDetector' in window) {
		statusText.textContent = 'BarcodeDetectorで読み取りを開始します'
		await startBarcodeDetectorScanner()
	} else {
		statusText.textContent = 'ZXingで読み取りを開始します'
		await startZxingScanner()
	}
}

async function startBarcodeDetectorScanner() {
	try {
		isScanning = true
		statusText.textContent = 'カメラ起動中...'

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

		const barcodeDetector = new BarcodeDetector({
			formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code'],
		})

		statusText.textContent = '読み取り中... バーコードを中央に映してください'

		const scanLoop = async () => {
			if (!isScanning || !currentStream) return

			try {
				const barcodes = await barcodeDetector.detect(video)

				if (barcodes.length > 0) {
					const barcode = barcodes[0].rawValue

					statusText.textContent = `読み取り成功：${barcode}`

					stopScanner()
					await fetchProduct(barcode)
					return
				}
			} catch (error) {
				console.error(error)
			}

			scanLoopId = requestAnimationFrame(scanLoop)
		}

		scanLoop()
	} catch (error) {
		console.error(error)
		statusText.textContent = `エラー：${error.name} / ${error.message}`
	}
}

async function startZxingScanner() {
	try {
		isScanning = true
		statusText.textContent = 'カメラ起動中...'

		if (!window.ZXingBrowser) {
			statusText.textContent = 'ZXingが読み込めていません'
			return
		}

		codeReader = new ZXingBrowser.BrowserMultiFormatReader()

		const devices = await ZXingBrowser.BrowserCodeReader.listVideoInputDevices()

		if (!devices || devices.length === 0) {
			statusText.textContent = 'カメラが見つかりません'
			return
		}

		const backCamera = devices.find((device) => {
			const label = device.label.toLowerCase()

			return label.includes('back') || label.includes('rear') || label.includes('environment') || label.includes('背面')
		})

		const selectedDeviceId = backCamera ? backCamera.deviceId : devices[devices.length - 1].deviceId

		statusText.textContent = '読み取り中... バーコードを中央に映してください'

		codeReader.decodeFromVideoDevice(selectedDeviceId, video, async (result, error) => {
			if (!isScanning) return

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
	isScanning = false

	if (scanLoopId) {
		cancelAnimationFrame(scanLoopId)
		scanLoopId = null
	}

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

async function testGasConnection() {
	try {
		statusText.textContent = 'GAS接続テスト中...'

		const url = `${GAS_API_URL}?action=ping`
		const res = await fetch(url)
		const data = await res.json()

		console.log('GAS TEST:', data)

		if (data.success) {
			statusText.textContent = `GAS接続OK：${data.message}`
		} else {
			statusText.textContent = 'GAS接続はできましたが、レスポンスが不正です'
		}
	} catch (error) {
		console.error(error)
		statusText.textContent = `GAS接続エラー：${error.name} / ${error.message}`
	}
}

async function fetchProduct(barcode) {
	try {
		productArea.innerHTML = '<p>商品検索中...</p>'

		const url = `${GAS_API_URL}?action=getProduct&barcode=${encodeURIComponent(barcode)}`
		const res = await fetch(url)
		const product = await res.json()

		console.log('PRODUCT:', product)

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
      <p>${error.name} / ${error.message}</p>
    `
	}
}
