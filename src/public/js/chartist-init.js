
(function($) {
	const dzChartlist = function(){
		const screenWidth = $(window).width();
			
		const setChartWidth = function(){
			
			if(screenWidth <= 768)
			{
				const chartBlockWidth = 0;
				if(screenWidth >= 500)
				{
					chartBlockWidth = 250;
				}else{
					chartBlockWidth = 300;
				}
				
				jQuery('.chartlist-chart').css('min-width',chartBlockWidth - 31);
			}
		}
		
		const multiLineChart = (fechas, datos) => {
			//Multi-line labels
			new Chartist.Bar('#multi-line-chart', {
				labels: fechas,
				series: datos,
			}, {
				seriesBarDistance: 10,
				axisX: { offset: 60 },
				axisY: {
					offset: 80,
					labelInterpolationFnc: function(value) {
						return '$' + value
					},
					scaleMinSpace: 15
				},
				plugins: [Chartist.plugins.tooltip()],
				classNames: {
					chart: 'ct-chart-bar',
					horizontalBars: 'ct-horizontal-bars',
					label: 'ct-label',
					labelGroup: 'ct-labels',
					series: 'ct-series',
					bar: 'ct-bar',
					grid: 'ct-grid',
					gridGroup: 'ct-grids',
					gridBackground: 'ct-grid-background',
					vertical: 'ct-vertical',
					horizontal: 'ct-horizontal',
					start: 'ct-start',
					end: 'ct-end'
				}
			});
		}

		/* Function ============ */
			return {
				init:function(){
				},
				
				load:function(){
					
					/** Gráfica de Rendimiento para Empresas */
					let matriz = new Array(), fechas = [];
					let dataEmpresa = document.querySelector('#jsonRendimiento')
					if (dataEmpresa) {
						dataEmpresa = dataEmpresa.value
						dataEmpresa = JSON.parse(dataEmpresa)
						if (dataEmpresa.length > 0) {
							for(let i=0;i<dataEmpresa.length; i++){
								matriz[i] = new Array();
								fechas.push(dataEmpresa[i].fecha)
								for(let j=0;j<3; j++){
									if(j == 0){
										matriz[i][j] = dataEmpresa[i].total_ventas                                    
									}  else if(j == 1){
										matriz[i][j] = dataEmpresa[i].total_compras                                    
									}else if(j == 2){
										matriz[i][j] = dataEmpresa[i].total_gastos    
									}
								}
							}
						// TRANPONER MATRIZ (Ej: de 3 COLUMNAS a 2)
						let arrayT = matriz[0].map((_, colIndex) => matriz.map(x => x[colIndex]));
						multiLineChart(fechas, arrayT) 
						}
					}
		  
				}
			}
	}();

	jQuery(document).ready(function(){
	});
		
	jQuery(window).on('load',function(){
		dzChartlist.load();
	});

	jQuery(window).on('resize',function(){
	});     

})(jQuery);