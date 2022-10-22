(function ($) {

	const dzGraficasDonas = function () {
		const coloresDim = ['#812082', '#f2f2f2'];
		
		const donutChartDim1 = (dim) => {
			Morris.Donut({
				element: 'morris-dimProducto',
				data: [{
					label: "\xa0 \xa0 Completado (%) \xa0 \xa0",
					value: dim.ok,
				}, {
					label: "\xa0 \xa0 Pendiente (%) \xa0 \xa0",
					value: dim.pendiente
				}],
				resize: true,
				redraw: true,
				colors: coloresDim,
				//responsive:true,
			});
		}
		const donutChartDim2 = (dim) => {
			Morris.Donut({
				element: 'morris-dimAdministracion',
				data: [{
					label: "\xa0 \xa0 Completado (%) \xa0 \xa0",
					value: dim.ok,
				}, {
					label: "\xa0 \xa0 Pendiente (%) \xa0 \xa0",
					value: dim.pendiente
				}],
				resize: true,
				redraw: true,
				colors: coloresDim,
				//responsive:true,
			});
		}
		const donutChartDim3 = (dim) => {
			Morris.Donut({
				element: 'morris-dimOperaciones',
				data: [{
					label: "\xa0 \xa0 Completado (%) \xa0 \xa0",
					value: dim.ok,
				}, {
					label: "\xa0 \xa0 Pendiente (%) \xa0 \xa0",
					value: dim.pendiente
				}],
				resize: true,
				redraw: true,
				colors: coloresDim,
				//responsive:true,
			});
		}
		const donutChartDim4 = (dim) =>{
			if (dim.ok)
			Morris.Donut({
				element: 'morris-dimMarketing',
				data: [{
					label: "\xa0 \xa0 Completado (%) \xa0 \xa0",
					value: dim.ok,
				}, {
					label: "\xa0 \xa0 Pendiente (%) \xa0 \xa0",
					value: dim.pendiente
				}],
				resize: true,
				redraw: true,
				colors: coloresDim,
				//responsive:true,
			});
		}

		const lineChartRendimiento = function(datos){
			Morris.Area({
				element: 'line_chart_ventas',
				data: datos,
				xkey: 'fecha',
				ykeys: ['ventas', 'compras', 'gastos'],
				labels: ['Total Ventas', 'Total Compras', 'Total Gastos'],
				pointSize: 3,
				fillOpacity: 0,
				pointStrokeColors: ['#ff6746', '#1bd084', '#1EA7C5'],
				behaveLikeLine: true,
				gridLineColor: 'gray',
				lineWidth: 3,
				hideHover: 'auto',
				lineColors: ['rgb(11, 42, 151)', 'rgb(27, 208, 132)', '#1EA7C5'],
				resize: true,
				parseTime: false,
				xLabelFormat: function (x) { return new Date(x.label).toLocaleDateString('en-US'); },
				yLabelFormat: function (y) { return '$' + y.toString(); }
			});
		}

		return {
			init: function () {
			},

			load: function () {
				let dim = document.querySelector('#jsonDimCompletada').value
				dim = JSON.parse(dim)
				dim.forEach(x => {
					if (x.ok == 'null' || x.ok == 'NaN' || x.pendiente == null) {
						x.ok = 0.0; x.pendiente = 0.0;
					}
				})
				console.log("DIM >> ", dim)
				donutChartDim1(dim[0])
				donutChartDim2(dim[1])
				donutChartDim3(dim[2])
				donutChartDim4(dim[3])
				/** Gráfica de Rendimiento para Empresas */
				let datos = []
				let dataEmpresa = document.querySelector('#jsonRendimiento').value
				dataEmpresa = JSON.parse(dataEmpresa)
				dataEmpresa.forEach(x => {
					datos.push({
						fecha: x.fecha,
						ventas: x.total_ventas,
						compras: x.total_compras,
						gastos: x.total_gastos
					})
				})
				lineChartRendimiento(datos)
			},

			resize: function () {
			}
		}

	}();

	jQuery(document).ready(function () {
	});

	jQuery(window).on('load', function () {
		dzGraficasDonas.load();
	});

	jQuery(window).on('resize', function () {
		//setTimeout(function () { dzGraficasDonas.resize(); }, 1000);
	});

})(jQuery);