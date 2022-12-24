(function () {

	const graficasDimensiones = function () {
		const options = {
			labels: ['% Completado', ' % Pendiente '],
			chart: {
				width: 150,
				type: 'pie',
			},
			legend: {
				show: false,
				position: 'bottom',
				horizontalAlign: 'center',
				verticalAlign: 'middle',
				floating: true,
				fontSize: '14px',
				offsetX: 0,
			},
			responsive: [{
				breakpoint: 600,
				options: {
					chart: {
						height: 240
					},
					legend: {
						show: true
					},
				}
			}],
			colors: ['#812082', '#979595'],
		};

		const chartDim1 = (dim) => {
			const opciones = options;
			opciones.series = [dim.ok, dim.pendiente];
			const chart = new ApexCharts(document.querySelector("#chart-dimProducto"), opciones);
			chart.render();
		}

		const chartDim2 = (dim) => {
			const opciones = options;
			opciones.series = [dim.ok, dim.pendiente];
			const chart = new ApexCharts(document.querySelector("#chart-dimAdministracion"), opciones);
			chart.render();
		}

		const chartDim3 = (dim) => {
			const opciones = options;
			opciones.series = [dim.ok, dim.pendiente];
			const chart = new ApexCharts(document.querySelector("#chart-dimOperaciones"), opciones);
			chart.render();
		}

		const chartDim4 = (dim) => {
			const opciones = options;
			opciones.series = [dim.ok, dim.pendiente];
			const chart = new ApexCharts(document.querySelector("#chart-dimMarketing"), opciones);
			chart.render();
		}

		return {
			init: function () {
			},
     
			load: function () {
				let infoGeneral = 0, count = 0, count2 = 0;
				let dim = document.querySelector('#jsonDimCompletada')
				if (dim) {
					dim = dim.value
					dim = JSON.parse(dim)
					dim.forEach(x => {
						if (x.ok == 'null' || x.ok == 'NaN' || x.pendiente == null) {
							x.ok = 0.0; x.pendiente = 0.0;
						}
						if (x.pendiente == 100) count2++;
						if (x.ok != 0) {
							count++;
							infoGeneral += parseInt(x.ok)
						}
					})
					count = count + count2
					infoGeneral = (infoGeneral/count).toFixed(0)
					if (infoGeneral > 0) {
						$('#dataGeneral').text(infoGeneral) 
					} else {
						$('#dataGeneral').text("0") 
					}
					// Barra de progreso
					$('#barra').css("width", infoGeneral + "%").attr("aria-valuenow", infoGeneral)
					console.log("HOLA SOY CONSULTOR" ,  dim);
					chartDim1(dim[0])
					chartDim2(dim[1])
					chartDim3(dim[2])
					chartDim4(dim[3])
					if (dim[0].ok == 0 && dim[0].pendiente == 0) { jQuery('#div-Producto').css('display', 'none') }
					if (dim[1].ok == 0 && dim[1].pendiente == 0) { jQuery('#div-Administracion').css('display', 'none') }
					if (dim[2].ok == 0 && dim[2].pendiente == 0) { jQuery('#div-Operaciones').css('display', 'none') }
					if (dim[3].ok == 0 && dim[3].pendiente == 0) { jQuery('#div-Marketing').css('display', 'none') }
				}
			},

			resize: function () {
			}
		}

	}();

	jQuery(document).ready(function () {
	});

	jQuery(window).on('load', function () {
		graficasDimensiones.load();
	});

	jQuery(window).on('resize', function () {
		//setTimeout(function () { dzGraficasDonas.resize(); }, 1000);
	});

})(jQuery);