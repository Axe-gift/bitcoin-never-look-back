import rawData from './data.js'
import ChartData from './chart-data.js'
import BasicChart from './nlb-basic-chart.js'
import RegressionChart from './nlb-regression-chart.js'
import ExtrapolationChart from './nlb-extrapolation-chart.js'
import fillDataPoints from './fill-data-points.js'

const chartData = new ChartData(rawData)

new BasicChart(chartData).drawChart()
new RegressionChart(chartData).drawChart()
new ExtrapolationChart(chartData).drawChart()
fillDataPoints(chartData)

// document.querySelector('#regression_chart_range')
//   .addEventListener('input', (e) => {
//     console.log('event', e)
//   })
