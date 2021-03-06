import d3 from '/js/external/d3.js'
import moment from '/js/external/moment.js'
import { moneyFormat, updateAllText, updateAllStyles } from '/js/util.js'

class ExtrapolationChart {
  constructor(chartData) {
    this.containerElement = '#extrapolation_chart'
    this.chartData = chartData
    this.maxDays = null
    this.maxPrice = null
    this.priceToRegressionRatio = this.getPriceToRegressionRatio()

    this.drawChart()
    this.setupRangeListener()
  }

  // Do this calculation once at the start so that we don't have to do the
  // d3.max on every chart rescale.
  getPriceToRegressionRatio() {
    const { data } = this.chartData
    const origMaxPrice = d3.max(data, (d) => d.price)
    const origMaxRegressionPlc = Math.pow(10, data[data.length-1].regressionPlc)
    const ratio = origMaxPrice / origMaxRegressionPlc
    return ratio
  }

  drawChart() {
    const {
      data,
      regressionData,
      standardDeviationPlc
    } = this.chartData

    // Vars for dimensions
    const margin = { top: 20, right: 20, bottom: 35, left: 75 }
    const width = 800
    const height = 400
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    // Clear the container
    document.querySelector(this.containerElement).innerHTML = ''

    // Create the chart SVG
    const svg = d3.select(this.containerElement)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('class', 'chart-svg')

    // Create and append the main group
    var g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`)

    // Set initial max vals for chart
    this.maxDays = data.length - 1
    this.maxPrice = d3.max(data, (d) => d.price)

    //===========================================================================

    // Create scales
    var xScale = d3.scaleTime().rangeRound([0, innerWidth])
    var yScale = d3.scaleLinear().rangeRound([innerHeight, 0])

    this.setScale = () => {
      xScale.domain([data[0].date, moment(data[0].date).add(this.maxDays, 'days').toDate()])
      yScale.domain([0, this.maxPrice])
    }

    this.setScale()

    //===========================================================================

    // Create price line
    var priceLine = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(d.price))

    // Create regression line
    var regressionLine = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(Math.pow(10, d.regressionPlc)))

    // Create regression through 3 peak prices
    const regressionLineTop = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(Math.pow(10, d.regressionPlcTop)))

    // Standard deviation line - bottom
    const regressionLineBottom = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(Math.pow(10, d.regressionPlc - standardDeviationPlc)))

    //===========================================================================

    const xGridCall = d3.axisBottom(xScale)
      .tickSize(-innerHeight)
      .tickFormat('')

    const yGridCall = d3.axisLeft(yScale)
      .tickSize(-innerWidth)
      .tickFormat('')

    const xAxisCall = d3.axisBottom(xScale)
    const yAxisCall = d3.axisLeft(yScale)

    // X gridlines - Draw gridlines first to put beneath axis
    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .attr('class', 'x grid')
      .call(xGridCall)

    // Y gridlines
    g.append('g')
      .attr('class', 'y grid')
      .call(yGridCall)

    // Bottom axis - Date
    g.append('g')
      .attr('class', 'x axis')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxisCall)

    // Left axis - Price
    g.append('g')
      .attr('class', 'y axis')
      .call(yAxisCall)
      .append('text')
      .attr('class', 'axis-text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 6)
      .attr('dy', '0.71em')
      .attr('text-anchor', 'end')
      .text('Price ($)')

    // Append the clip path
    g.append('clipPath')
      .attr('id', 'extrapolation_chart_clip')
      .append('rect')
      .attr('x', 0)
      .attr('y', 0 - margin.top)
      .attr('width', innerWidth + margin.right)
      .attr('height', innerHeight + margin.top)

    // Append the price line
    const pricePath = g.append('path')
      .datum(data)
      .attr('class', 'path-line path-price')
      .attr('d', priceLine)

    // Append the regression line
    const regressionLinePath = g.append('path')
      .datum(regressionData)
      .attr('class', 'path-line path-regression')
      .attr('clip-path', "url(#extrapolation_chart_clip)")
      .attr('d', regressionLine)

    // Append regression through 3 peak prices
    const regressionLineTopPath = g.append('path')
      .datum(regressionData)
      .attr('class', 'path-line path-regression-std-dev')
      .attr('clip-path', "url(#extrapolation_chart_clip)")
      .attr('d', regressionLineTop)

    // Append regression standard deviation bottom
    const bottomDeviationPath = g.append('path')
      .datum(regressionData)
      .attr('class', 'path-line path-regression-std-dev')
      .attr('clip-path', "url(#extrapolation_chart_clip)")
      .attr('d', regressionLineBottom)

    this.rescale = () => {
      this.setScale()

      g.select('.x.grid')
        .call(xGridCall)

      g.select('.y.grid')
        .call(yGridCall)

      g.select('.x.axis')
        .call(xAxisCall)

      g.select('.y.axis')
        .call(yAxisCall)

      pricePath
        .attr('d', priceLine)

      regressionLinePath
        .attr('d', regressionLine)

      regressionLineTopPath
        .attr('d', regressionLineTop)

      bottomDeviationPath
        .attr('d', regressionLineBottom)
    }

    // Append verticle line - must be appended to a group, not rect
    const mouseLine = g.append('line')
      .attr('class', 'mouse-line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', 0)
      .attr('y2', innerHeight)
      .attr('visibility', 'hidden')

    // Circles - must be appended to a group, not rect
    const mouseCirclePrice = g.append('circle')
      .attr('class', 'mouse-circle mouse-circle-price')
      .attr('visibility', 'hidden')

    const mouseCircleRegression = g.append('circle')
      .attr('class', 'mouse-circle mouse-circle-regression')
      .attr('visibility', 'hidden')

    const mouseCircleRegressionTop = g.append('circle')
      .attr('class', 'mouse-circle mouse-circle-deviation')
      .attr('visibility', 'hidden')

    const mouseCircleRegressionMin = g.append('circle')
      .attr('class', 'mouse-circle mouse-circle-deviation')
      .attr('visibility', 'hidden')

    // Rect to catch mouse movements
    const mouseArea = g.append('rect')
      .attr('class', 'mouse-overlay')
      .attr('width', innerWidth + margin.right)
      .attr('height', innerHeight)
      .on('mouseover', mouseOver)
      .on('mouseout', mouseOut)
      .on('mousemove', mouseMove)
      .on('touchstart', mouseOver)
      .on('touchend', mouseOut)
      .on('touchmove', mouseMove)

    const bisectDate = d3.bisector((d) => d.date).right

    function mouseOver() {
      g.select('.mouse-line').style('visibility', 'visible')
      g.selectAll('.mouse-circle').style('visibility', 'visible')
      updateAllStyles('#extrapolation .chart-data', 'visibility', 'visible')
    }

    function mouseOut() {
      g.select('.mouse-line').style('visibility', 'hidden')
      g.selectAll('.mouse-circle').style('visibility', 'hidden')
      updateAllStyles('#extrapolation .chart-data', 'visibility', 'hidden')
    }

    function mouseMove() {
      const mouse = d3.mouse(this)
      const date = xScale.invert(mouse[0]) // map value from range to domain
      const index = bisectDate(regressionData, date, 1) // get the index for the domain value
      const item = regressionData[index]
      const xPos = xScale(date)

      if (!item) {
        return
      }

      if (item.price) {
        const yPosPrice = yScale(item.price)
        g.select('.mouse-circle-price')
          .style('visibility', 'visible')
          .attr('transform', `translate(${xPos},${yPosPrice})`)
        updateAllText('#extrapolation .price', moneyFormat(item.price))
      }
      else {
        g.select('.mouse-circle-price').style('visibility', 'hidden')
        updateAllText('#extrapolation .price', '???')
      }

      const regressionPrice = Math.pow(10, item.regressionPlc)
      const regressionPriceTop = Math.pow(10, item.regressionPlcTop)
      const regressionPriceMin = Math.pow(10, item.regressionPlc - standardDeviationPlc)

      const yPosRegression = yScale(regressionPrice)
      const yPosRegressionTop = yScale(regressionPriceTop)
      const yPosRegressionMin = yScale(regressionPriceMin)

      mouseLine.attr('transform', `translate(${xPos},0)`)
      mouseCircleRegression.attr('transform', `translate(${xPos},${yPosRegression})`)
      mouseCircleRegressionTop.attr('transform', `translate(${xPos},${yPosRegressionTop})`)
      mouseCircleRegressionMin.attr('transform', `translate(${xPos},${yPosRegressionMin})`)

      updateAllText('#extrapolation .expected', moneyFormat(regressionPrice))
      updateAllText('#extrapolation .d-max', moneyFormat(regressionPriceTop))
      updateAllText('#extrapolation .d-min', moneyFormat(regressionPriceMin))
      updateAllText('#extrapolation .date', moment(item.date).format('MMM D, YYYY'))
    }
  }

  setupRangeListener() {
    document.querySelector('#extrapolation_chart_range')
      .addEventListener('input', this.rangeChange.bind(this))
  }

  mapInputRangeToDays(inputRangeValue) {
    inputRangeValue = 100 - inputRangeValue
    const min = this.chartData.data.length
    const max = 10000 - 1 // Constants.regressionData.maxDays
    const rangeDiff = max - min
    const percent = inputRangeValue / 100
    const offset = rangeDiff * percent
    const pos = min + offset
    return Math.round(pos)
  }

  rangeChange(e) {
    const maxDays = this.mapInputRangeToDays(e.target.value)

    const { regressionData } = this.chartData
    const maxRegressionPlc = Math.pow(10, regressionData[maxDays].regressionPlc)
    const maxPrice = maxRegressionPlc * this.priceToRegressionRatio

    this.maxDays = maxDays
    this.maxPrice = maxPrice

    this.rescale()
  }
}

export default ExtrapolationChart
