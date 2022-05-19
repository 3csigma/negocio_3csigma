(function($) {
    /* "use strict" */

 var dzChartlist = function(){
	let draw = Chart.controllers.line.__super__.draw; //draw shadow
	var screenWidth = $(window).width();
	var chartBar = function(){
		var optionsArea = {
          series: [{
            name: "Nuevas Empresas",
            data: [20, 40, 20, 80, 40, 40, 65, 5, 32, 72, 50, 20]
          }
        ],
          chart: {
          height: 400,
          type: 'area',
		  group: 'social',
		  toolbar: {
            show: false
          },
          zoom: {
            enabled: false
          },
        },
        dataLabels: {
          enabled: false
        },
        stroke: {
          width: [4],
		  colors:['#FED061'],
		  curve: 'smooth'
        },
        legend: {
			show:false,
          tooltipHoverFormatter: function(val, opts) {
            return val + ' - ' + opts.w.globals.series[opts.seriesIndex][opts.dataPointIndex] + ''
          },
		  markers: {
			fillColors:['#FED061'],
			width: 19,
			height: 19,
			strokeWidth: 0,
			radius: 19
		  }
        },
        markers: {
		  strokeWidth: [4],
		  strokeColors: ['#FED061'],
		  border:0,
		  colors:['#fff'],
          hover: {
            size: 6,
          }
        },
        xaxis: {
          categories: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
		  labels: {
		   style: {
			  colors: '#3E4954',
			  fontSize: '14px',
			   fontFamily: 'Poppins',
			  fontWeight: 100,
			  
			},
		  },
        },
		yaxis: {
			labels: {
			offsetX:-16,
		   style: {
			  colors: '#3E4954',
			  fontSize: '14px',
			   fontFamily: 'Poppins',
			  fontWeight: 100,
			  
			},
		  },
		},
		fill: {
			colors:['#FED061'],
			type:'solid',
			opacity: 0.7
		},
		colors:['#FED061'],
        grid: {
          borderColor: '#f1f1f1',
		  xaxis: {
            lines: {
              show: true
            }
          }
        },
		responsive: [{
			breakpoint: 575,
			options: {
				chart: {
					height: 250,
				}
			}
		 }]
        };
		var chartArea = new ApexCharts(document.querySelector("#chartBar"), optionsArea);
        chartArea.render();

	}
	var chartBar2 = function(){
		var optionsArea = {
          series: [{
            name: "Nuevos Consultores",
            data: [40, 40, 30, 90, 10, 80, 40, 40, 30, 90, 10, 80]
          }
        ],
          chart: {
          height: 400,
          type: 'area',
		  group: 'social',
		  toolbar: {
            show: false
          },
          zoom: {
            enabled: false
          },
        },
        dataLabels: {
          enabled: false
        },
        stroke: {
          width: [4],
		  colors:['#812082'],
		  curve: 'smooth'
        },
        legend: {
			show:false,
          tooltipHoverFormatter: function(val, opts) {
            return val + ' - ' + opts.w.globals.series[opts.seriesIndex][opts.dataPointIndex] + ''
          },
		  markers: {
			fillColors:['#812082'],
			width: 19,
			height: 19,
			strokeWidth: 0,
			radius: 19
		  }
        },
        markers: {
		  strokeWidth: [4],
		  strokeColors: ['#812082'],
		  border:0,
		  colors:['#fff'],
          hover: {
            size: 6,
          }
        },
        xaxis: {
          categories: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
		  labels: {
		   style: {
			  colors: '#3E4954',
			  fontSize: '14px',
			   fontFamily: 'Poppins',
			  fontWeight: 100,
			  
			},
		  },
        },
		yaxis: {
			labels: {
			offsetX:-16,
		   style: {
			  colors: '#3E4954',
			  fontSize: '14px',
			   fontFamily: 'Poppins',
			  fontWeight: 100,
			  
			},
		  },
		},
		fill: {
			colors:['#812082'],
			type:'solid',
			opacity: 0.7
		},
		colors:['#812082'],
        grid: {
          borderColor: '#f1f1f1',
		  xaxis: {
            lines: {
              show: true
            }
          }
        },
		 responsive: [{
			breakpoint: 575,
			options: {
				chart: {
					height: 250,
				}
			}
		 }]
        };
		var chartArea = new ApexCharts(document.querySelector("#chartBar2"), optionsArea);
        chartArea.render();

	}
	var chartBar3 = function(){
		var optionsArea = {
          series: [{
            name: "Informes generados",
            data: [20, 15, 50, 20, 50, 30, 18, 25, 60, 15, 20, 45]
          }
        ],
          chart: {
          height: 400,
          type: 'area',
		  group: 'social',
		  toolbar: {
            show: false
          },
          zoom: {
            enabled: false
          },
        },
        dataLabels: {
          enabled: false
        },
        stroke: {
          width: [4],
		  colors:['#50368C'],
		  curve: 'smooth'
        },
        legend: {
			show:false,
          tooltipHoverFormatter: function(val, opts) {
            return val + ' - ' + opts.w.globals.series[opts.seriesIndex][opts.dataPointIndex] + ''
          },
		  markers: {
			fillColors:['#50368C'],
			width: 19,
			height: 19,
			strokeWidth: 0,
			radius: 19
		  }
        },
        markers: {
		  strokeWidth: [4],
		  strokeColors: ['#50368C'],
		  border:0,
		  colors:['#fff'],
          hover: {
            size: 12,
          }
        },
        xaxis: {
          categories: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
		  labels: {
		   style: {
			  colors: '#3E4954',
			  fontSize: '14px',
			   fontFamily: 'Poppins',
			  fontWeight: 100,
			  
			},
		  },
        },
		yaxis: {
			labels: {
			offsetX:-16,
		   style: {
			  colors: '#3E4954',
			  fontSize: '14px',
			   fontFamily: 'Poppins',
			  fontWeight: 100,
			  
			},
		  },
		},
		fill: {
			colors:['#50368C'],
			type:'solid',
			opacity: 0.7
		},
		colors:['#50368C'],
        grid: {
          borderColor: '#f1f1f1',
		  xaxis: {
            lines: {
              show: true
            }
          }
        },
		 responsive: [{
			breakpoint: 575,
			options: {
				chart: {
					height: 250,
				}
			}
		 }] 
        };
		var chartArea = new ApexCharts(document.querySelector("#chartBar3"), optionsArea);
        chartArea.render();

	}
	
	/* Function ============ */
		return {
			init:function(){
			},
			
			
			load:function(){
				chartBar();
				chartBar2();
				chartBar3();
			},
			
			resize:function(){
				
			}
		}
	
	}();

	jQuery(document).ready(function(){
	});
		
	jQuery(window).on('load',function(){
		setTimeout(function(){
			dzChartlist.load();
		}, 1000); 
		
	});

	jQuery(window).on('resize',function(){
		
		
	});     

})(jQuery);