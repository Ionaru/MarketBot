import * as d3 from 'd3';
import D3Node from 'd3-node';
import puppeteer from 'puppeteer';

interface IData {
    x: Date;
    y: number;
}

export const createLineGraph = (data: IData[], chartName = 'Line graph', extraText = '') => {

    const backgroundColor = '#36393e';
    const textColor = '#939597';
    const lineColor = '#7289da';

    const graphStyles = [
        `background-color: ${backgroundColor}`,
        `color: ${textColor}`,
        'font-family: Helvetica, Arial, sans-serif',
        'position: absolute',
        'top: 0',
        'left: 0',
    ].join(';');

    const selector = '#chart';

    const container = `
  <div id="container" style="${graphStyles}">
    <h2 style="padding-left: 73px; display: inline-block;">${chartName}</h2>
    <h2 style="padding-right: 73px; float: right;">${extraText}</h2>
    <div id="chart"></div>
  </div>
  `;

    const d3n = new D3Node({
        container,
        selector,
    });

    const margin = {bottom: 125, left: 75, right: 75, top: 0};
    const pageWidth = 1200;
    const pageHeight = 600;
    const tickSize = 5;
    const tickPadding = 2;
    const lineWidth = 3;

    const graphWidth = (pageWidth - margin.left) - margin.right;
    const graphHeight = (pageHeight - margin.top) - margin.bottom;

    d3n.width = pageWidth;
    d3n.height = pageHeight;

    const svg = d3n.createSVG(pageWidth, pageHeight)
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const g = svg.append('g');

    const timeFormat = d3.utcFormat('%a, %m-%d');

    const xScale = d3.scaleUtc().rangeRound([0, graphWidth]);
    const xAxis = d3.axisBottom(xScale).tickFormat(timeFormat as any).tickSize(tickSize);

    const yScale = d3.scaleLinear().rangeRound([graphHeight, 0]);
    const yAxis = d3.axisLeft(yScale).tickSize(tickSize).tickPadding(tickPadding);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const lineChart = d3.line().x((d: any) => xScale(d.x)!).y((d: any) => yScale(d.y)!);

    const makeXGridlines = (height: number) => d3.axisBottom(xScale)
        .ticks(data.length)
        .tickFormat(timeFormat as any)
        .tickSize(-height);

    const makeYGridlines = (width: number) => d3.axisLeft(yScale)
        .ticks(10)
        .tickSize(-width);

    // Set scope of X-axis.
    const startDate = new Date(data[data.length - 1].x);
    const endDate = new Date(data[0].x);
    xScale.domain([startDate, endDate]);

    // Set scope of Y-axis.
    const yValues = data.map((d) => d.y);
    const minValue = Math.min(...yValues);
    const maxValue = Math.max(...yValues);
    const adjustedMinValue = minValue - (minValue * 0.01);
    const adjustedMaxValue = maxValue + (maxValue * 0.01);
    yScale.domain([adjustedMinValue, adjustedMaxValue]);

    g.append('g')
        .attr('transform', `translate(0, ${graphHeight})`)
        .call(xAxis)
        .call(makeXGridlines(graphHeight));

    g.selectAll('text')
        .attr('y', 0)
        .attr('x', 9)
        .attr('dy', '.35em')
        .attr('transform', 'rotate(45)')
        .style('text-anchor', 'start');

    g.append('g')
        .call(yAxis)
        .call(makeYGridlines(graphWidth));

    g.selectAll('line')
        .attr('stroke', textColor);

    g.selectAll('text')
        .attr('fill', textColor);

    g.selectAll('path.domain')
        .attr('stroke', textColor);

    g.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', lineColor)
        .attr('stroke-width', lineWidth)
        .attr('d', lineChart);

    return d3n;
};

export const exportGraphImage = async (graph: any, path: string) => {

    const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
    const page = await browser.newPage();
    await page.setContent(graph.html());

    const viewport = {height: graph.height, width: graph.width};
    await page.setViewport(viewport);

    const type = 'png' as const;
    const screenShotOptions = {path, type, viewport};
    await page.screenshot(screenShotOptions);

    browser.close().then();
};
