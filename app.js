const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbx1n6HDvtriCGbXZXYCJW7eUMDkO9Uex3VRXMUPq_sNo_cRpQn5m5rT1p9cputdhAWQ/exec'
const scanBtn = document.getElementById('scanBtn')
const video = document.getElementById('video')
const statusText = document.getElementById('status')

scanBtn.addEventListener('click', () => {
	statusText.textContent = 'ボタンは反応しています'
	startScanner()
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

		const stream = await navigator.mediaDevices.getUserMedia({
			video: {
				facingMode: { ideal: 'environment' },
			},
			audio: false,
		})

		video.srcObject = stream
		await video.play()

		statusText.textContent = '読み取り中...'

		const codeReader = new ZXingBrowser.BrowserMultiFormatReader()

		codeReader.decodeFromVideoElement(video, async (result, err) => {
			if (result) {
				const barcode = result.getText()

				statusText.textContent = `読み取り成功：${barcode}`

				codeReader.reset()
				stream.getTracks().forEach((track) => track.stop())

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
		const url = `${GAS_API_URL}?action=getProduct&barcode=${encodeURIComponent(barcode)}`

		const res = await fetch(url)
		const product = await res.json()

		if (!product) {
			document.getElementById('productArea').innerHTML = `
<p>商品が見つかりません</p>
<p>${barcode}</p>
`
			return
		}

		document.getElementById('productArea').innerHTML = `
<h2>${product.name}</h2>
<p>${Number(product.price).toLocaleString()}円</p>
`
	} catch (error) {
		document.getElementById('productArea').innerHTML = `
<p>商品取得エラー</p>
<p>${error.message}</p>
`
	}
}
