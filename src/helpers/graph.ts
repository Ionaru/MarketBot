import * as d3 from 'd3';
import * as D3Node from 'd3-node';
import * as fs from 'fs';
import * as puppeteer from 'puppeteer';

interface IData {
  x: Date;
  y: number;
}

export function createLineGraph(data: IData[], chartName = 'Line graph') {
  const _selector = '#chart';
  const _container = `<div id="container"><h2>${chartName}</h2><div id="chart"></div></div>`;
  const _style = '';
  const d3n = new D3Node({
    container: _container,
    selector: _selector,
    svgStyles: _style
  });

  const _margin = {top: 0, right: 75, bottom: 75, left: 75};
  const _width = 1200;
  const _height = 600;
  const _tickSize = 5;
  const _tickPadding = 2;
  // const _isCurve = true;
  const _lineColor = 'steelblue';
  const _lineWidth = 3;

  const width = (_width - _margin.left) - _margin.right;
  const height = (_height - _margin.top) - _margin.bottom;

  d3n.width = _width;
  d3n.height = _height;

  const svg = d3n.createSVG(_width, _height)
    .append('g').style('color', 'white').style('background-color', 'black')
    .attr('transform', `translate(${_margin.left}, ${_margin.top})`);

  const g = svg.append('g');

  const timeFormat = d3.utcFormat('%a');

  const xScale = d3.scaleUtc().rangeRound([0, width]);
  const xAxis = d3.axisBottom(xScale).tickFormat(timeFormat).tickSize(_tickSize);

  const yScale = d3.scaleLinear().rangeRound([height, 0]);
  const yAxis = d3.axisLeft(yScale).tickSize(_tickSize).tickPadding(_tickPadding);

  const lineChart = d3.line().x((d: any) => xScale(d.x)).y((d: any) => yScale(d.y));

  function make_x_gridlines() {
    return d3.axisBottom(xScale)
      .ticks(data.length)
      .tickFormat(timeFormat);
  }

// gridlines in y axis function
  function make_y_gridlines() {
    return d3.axisLeft(yScale)
      .ticks(10);
  }

  // var line = d3.svg.line()
  //   .x(function(d) {return yScale(d.quarter) + xScale.rangeBand() / 2 })
  //   .y(function(d) {return yScale(d.votes) });

  // const line = d3.line();
  // line.x((d: any) => yScale(d.quarter) + xScale.bandwidth() / 2);
  // line.y((d: any) => yScale(d.votes));

  const startDate = new Date(data[data.length - 1].x);
  const endDate = new Date(data[0].x);

  console.log(d3.extent(data, (d) => d.x) as any);
  console.log([startDate, endDate]);
  xScale.domain([startDate, endDate]);
  yScale.domain(d3.extent(data, (d) => d.y) as any);

  g.append('g')
    .attr('transform', `translate(0, ${height})`)
    .call(xAxis)
    .call(make_x_gridlines()
      .tickSize(-height));

  g.append('g')
    .call(yAxis)
    .call(make_y_gridlines()
      .tickSize(-width));

  g.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', _lineColor)
    .attr('stroke-width', _lineWidth)
    .attr('d', lineChart);

  return d3n;
}

export async function exportGraphImage(graph: any, outputName: string) {

  const html = graph.html();
  fs.writeFileSync('output.html', html);
  const viewport = {width: graph.width, height: graph.height};

  const type = 'png' as 'png';
  const screenShotOptions = {viewport, type, path: outputName};

  const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
  const page = await browser.newPage();
  await page.setContent(html);
  if (viewport) {
    await page.setViewport(viewport);
  }
  await page.screenshot(screenShotOptions);
  browser.close().then();
}
