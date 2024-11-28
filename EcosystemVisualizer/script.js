import { data as stacksData, colorScheme } from './data.js';

const margin = { top: 20, right: 90, bottom: 30, left: 90 };
const width = window.innerWidth - margin.left - margin.right;
const height = window.innerHeight - margin.top - margin.bottom;

const svg = d3.select("#visualization")
    .append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${width / 2 + margin.left},${height / 2 + margin.top})`);

const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

const tree = d3.tree()
    .size([360, 0])
    .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);

const root = d3.hierarchy(stacksData);

let nodeId = 0;
root.descendants().forEach(d => {
    d.id = nodeId++;
    d._children = d.children;
});

function toggleNode(d) {
    if (d.children) {
        d._children = d.children;
        d.children = null;
    } else {
        d.children = d._children;
        d._children = null;
    }
}

function update(source) {
    const duration = 750;

    tree(root);

    const nodes = root.descendants();
    const links = root.links();

    // Normalize for fixed-depth
    let maxDepth = 0;
    nodes.forEach(d => {
        d.y = d.depth * 1720;
        maxDepth = Math.max(maxDepth, d.depth);
    });

    // Adjust the tree size based on the maximum depth
    const radius = Math.min(width, height) / 2 - 999;
    tree.size([360, radius]);
    tree(root);

    // Update the nodes
    const node = svg.selectAll("g.node")
        .data(nodes, d => d.id);

    const nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `rotate(${source.x0 - 90}) translate(${source.y0},0)`)
        .on("click", (event, d) => {
            event.stopPropagation();
            if (d.data.url) {
                window.open(d.data.url, '_blank');
            } else {
                toggleNode(d);
                update(d);
            }
            showInfoPanel(d);
        })
        .on("mouseover", (event, d) => showTooltip(event, d))
        .on("mouseout", hideTooltip);

    nodeEnter.append("circle")
        .attr("r", 5)
        .style("fill", d => d._children ? "#555" : getNodeColor(d))
        .style("cursor", d => d.data.url ? "pointer" : "default");

    nodeEnter.append("text")
        .attr("dy", ".31em")
        .text(d => d.data.name)
        .style("fill-opacity", 0)
        .attr("transform", d => `rotate(${d.x < 180 ? 0 : 180})`)
        .attr("text-anchor", d => d.x < 180 ? "start" : "end")
        .attr("x", d => d.x < 180 ? 8 : -8)
        .style("cursor", d => d.data.url ? "pointer" : "default");

    const nodeUpdate = nodeEnter.merge(node);

    nodeUpdate.transition()
        .duration(duration)
        .attr("transform", d => `rotate(${d.x - 90}) translate(${d.y},0)`);

    nodeUpdate.select("circle")
        .attr("r", 5)
        .style("fill", d => d._children ? "#555" : getNodeColor(d));

    nodeUpdate.select("text")
        .style("fill-opacity", 1)
        .attr("transform", d => {
            const rotation = d.x < 180 ? 0 : 180;
            return `rotate(${rotation})`;
        })
        .attr("text-anchor", d => d.x < 180 ? "start" : "end")
        .attr("x", d => d.x < 180 ? 8 : -8);

    const nodeExit = node.exit().transition()
        .duration(duration)
        .attr("transform", d => `rotate(${source.x - 90}) translate(${source.y},0)`)
        .remove();

    nodeExit.select("circle").attr("r", 1e-6);
    nodeExit.select("text").style("fill-opacity", 1e-6);

    // Update the links
    const link = svg.selectAll("path.link")
        .data(links, d => d.target.id);

    const linkEnter = link.enter().insert("path", "g")
        .attr("class", "link")
        .attr("d", d3.linkRadial()
            .angle(d => source.x0 * Math.PI / 180)
            .radius(d => source.y0));

    linkEnter.merge(link).transition()
        .duration(duration)
        .attr("d", d3.linkRadial()
            .angle(d => d.x * Math.PI / 180)
            .radius(d => d.y));

    link.exit().transition()
        .duration(duration)
        .attr("d", d3.linkRadial()
            .angle(d => source.x * Math.PI / 180)
            .radius(d => source.y))
        .remove();

    nodes.forEach(d => {
        d.x0 = d.x;
        d.y0 = d.y;
    });
}

function getNodeColor(d) {
    if (d.depth === 0) return colorScheme.default;
    if (d.depth === 1) return colorScheme[d.data.name] || colorScheme.default;
    return colorScheme[d.parent.data.name] || colorScheme.default;
}

function showTooltip(event, d) {
    if (d.data.description) {
        tooltip.transition()
            .duration(200)
            .style("opacity", .9);
        tooltip.html(d.data.description)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
    }
}

function hideTooltip() {
    tooltip.transition()
        .duration(500)
        .style("opacity", 0);
}

root.x0 = 0;
root.y0 = 0;
update(root);

// Zoom functionality
const zoom = d3.zoom()
    .scaleExtent([0.3, 3])
    .on("zoom", (event) => {
        svg.attr("transform", `translate(${event.transform.x + width / 2 + margin.left},${event.transform.y + height / 2 + margin.top}) scale(${event.transform.k})`);
    });

d3.select("svg").call(zoom);

// Initial zoom to fit content
const initialScale = 0.8;
svg.attr("transform", `translate(${width / 2 + margin.left},${height / 2 + margin.top}) scale(${initialScale})`);

// Info panel functionality
document.getElementById("closeInfo").addEventListener("click", () => {
    document.getElementById("infoPanel").style.display = "none";
});

function showInfoPanel(d) {
    const infoPanel = document.getElementById("infoPanel");
    const infoTitle = document.getElementById("infoTitle");
    const infoDescription = document.getElementById("infoDescription");
    const infoLink = document.getElementById("infoLink");

    infoTitle.textContent = d.data.name;
    infoDescription.textContent = d.data.description || "No description available.";
    
    if (d.data.url) {
        infoLink.href = d.data.url;
        infoLink.textContent = "Learn More";
    } else {
        infoLink.href = "";
        infoLink.textContent = "";
    }

    infoPanel.style.display = "block";
}

// Search functionality
document.getElementById("search-button").addEventListener("click", searchNodes);
document.getElementById("search-input").addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
        searchNodes();
    }
});

function searchNodes() {
    const searchTerm = document.getElementById("search-input").value.toLowerCase();
    const nodes = root.descendants();
    const matchingNode = nodes.find(node => node.data.name.toLowerCase().includes(searchTerm));
    
    if (matchingNode) {
        // Expand all parent nodes
        let currentNode = matchingNode;
        while (currentNode.parent) {
            currentNode.parent.children = currentNode.parent._children;
            currentNode = currentNode.parent;
        }
        update(root);
        
        // Center and highlight the found node
        const transform = d3.zoomIdentity
            .translate(width / 2 + margin.left, height / 2 + margin.top)
            .scale(1)
            .translate(-matchingNode.y * Math.cos(matchingNode.x - Math.PI / 2), -matchingNode.y * Math.sin(matchingNode.x - Math.PI / 2));
        
        svg.transition().duration(750).call(zoom.transform, transform);
        
        d3.select(matchingNode.element).select("circle")
            .transition()
            .duration(750)
            .attr("r", 10)
            .attr("fill", "red")
            .transition()
            .duration(750)
            .attr("r", 5)
            .attr("fill", d => d._children ? "#555" : (colorScheme[d.data.name] || colorScheme.default));
    }
}

// Zoom controls
document.getElementById("zoom-in").addEventListener("click", () => {
    svg.transition().call(zoom.scaleBy, 1.3);
});

document.getElementById("zoom-out").addEventListener("click", () => {
    svg.transition().call(zoom.scaleBy, 1 / 1.3);
});

// Legend
const legend = d3.select("#legend");
Object.entries(colorScheme).forEach(([key, value]) => {
    if (key !== "default") {
        legend.append("div")
            .style("display", "flex")
            .style("align-items", "center")
            .style("margin-bottom", "5px")
            .html(`<span style="display:inline-block; width:20px; height:20px; background-color:${value}; margin-right:5px;"></span>${key}`);
    }
});

// Export functionality
document.getElementById("export-button").addEventListener("click", () => {
    const svgData = new XMLSerializer().serializeToString(document.querySelector("svg"));
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
        canvas.width = width + margin.right + margin.left;
        canvas.height = height + margin.top + margin.bottom;
        ctx.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = "john_jay_mind_map.png";
        downloadLink.href = pngFile;
        downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
});

// Responsive design
window.addEventListener("resize", () => {
    const newWidth = window.innerWidth - margin.left - margin.right;
    const newHeight = window.innerHeight - margin.top - margin.bottom;
    d3.select("svg")
        .attr("width", newWidth + margin.right + margin.left)
        .attr("height", newHeight + margin.top + margin.bottom);
    svg.attr("transform", `translate(${newWidth / 2 + margin.left},${newHeight / 2 + margin.top}) scale(${initialScale})`);
});
