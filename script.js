const blogPosts = [
            {
                id: 1,
                title: "Temp",
                date: "2025-09-15",
                tags: ["mathematics"],
                excerpt: "Temp",
                content: `
                    <body class="stackedit">
  <div class="stackedit__html"><h1 id="how-to-make-the-gpu-and-cpu-trade-when-they-dont-want-to-need-other-name">How to make the GPU and CPU trade when they don’t want to (Need other name)</h1>
<h2 id="tldr">TLDR</h2>
<p>Transferring data to the GPU from the CPU is way harder than it seems, but when you see the parts step by step it’s not that bad.</p>
<h2 id="intro-need-other-name">Intro (Need other name)</h2>
<p>Two years ago I optimistically began working on my block-game with the intention of building it up bottom up from first principles. Not relying on any game engine and graphics engine. About two weeks later I finally built the Hello World equivalent of graphics programming: Drawing a triangle, and was so exhausted by the complexity of what I was doing that I put this <strong>project on hiatus</strong>.</p>
<p>It’s 2025 now, and I’ve grown a lot more comfortable in complexity. My programming skills have in general also improved by a lot, so it was <strong>time to continue what I started</strong>.</p>
<h2 id="the-biggest-problem-to-fix">The biggest problem to fix</h2>
<p>The biggest problem the code had, was <strong>hardcoded variables</strong>. It might’ve impressively drawn a triangle on the screen, but the coordinates (and color values) of the edges of that triangle were hardcoded in a file that compiled it to machine code manually. Which basically meant that if you wanted to change the coordinates of those edges, you’d have to:</p>
<ul>
<li>manually change them in that file,</li>
<li>compile them to machine code with a command line script,</li>
<li>and then rerun the rust code.</li>
</ul>
<p>I hope you realize that this wouldn’t work for a graphics engine. In a game when we break a block, we need that block to disappear. Right now that isn’t possible since all coordinates are fixed until we restart our ‘game’.</p>
<h2 id="the-setupthe-plan">The setup/The plan</h2>
<p>You would think that this is not that hard. Just define the variables in the Rust code and send them over to the GPU so it can draw them whenever required. Nevertheless it is not that easy. Our Rust code is executed on the CPU, and in general the CPU can’t access the GPU’s memory and vice versa.</p>
<blockquote>
<p>Except if you are on Apple silicon and even then there are some caveats where the CPU can’t always access the GPU’s memory even though they share the same memory.</p>
</blockquote>
<p>Luckily there exists a part of memory that doesn’t necessarily belong to either the CPU or GPU, a space that both of them can access. Nice! You would think, let us just <strong>copy our data</strong> to that memory and then <strong>the GPU can just grab it and use it.</strong> You would actually be correct here, that is the basic gist of what we will do. It will just be way harder and more convoluted than you would think, especially since the GPU is a highly specialized machine that needs to know exactly what it will get, what it needs to be used for and when it needs to be used.</p>
<p>The <strong>basic plan</strong> we will follow is this:</p>
<ul>
<li>Construct our coordinate data.</li>
<li>Construct a piece of paper that tells us: the type of data we have, the size of our data (in bytes), what the data will be used for, how many processes are supposed to be able to access the data and some other configurations we will set to default for now.</li>
<li>Figure out, given our constraints above, what are the requirements we need for this data to be stored properly in the shared pool of memory and in the GPU?</li>
<li>Find a memory type that for fills the requirements from the previous step</li>
<li>Now we actually allocate some memory in the shared pool that both GPU and CPU can access.</li>
<li>Give our piece of paper from step 2 to the GPU, so it knows what it has to do with the data when it has access to it.</li>
<li>Acquire the adress of where we will copy our data in shared memory.</li>
<li>Copy the data.</li>
<li>Throw away the adress for optimization’s sake.</li>
</ul>
<p>I hope you now see that this is harder that it seems. Let us get to it.</p>
<h2 id="vertices">Vertices</h2>
<h2 id="bufferhousing-document">Buffer/Housing document</h2>
<h2 id="memory-requirements">Memory requirements</h2>
<h2 id="finding-a-suitable-memory-type">Finding a suitable memory type</h2>
<h2 id="allocating-the-gpu-memory">Allocating the GPU memory</h2>
<h2 id="binding-the-buffer-to-allocated-memory">Binding the buffer to allocated memory</h2>
<h2 id="mapping-the-memory-cpu-pointer">Mapping the memory (CPU pointer)</h2>
<h2 id="copying-the-data">Copying the data</h2>
<h2 id="unmapping-the-memory-cpu-pointer">Unmapping the memory (CPU pointer)</h2>
<h2 id="recap">Recap</h2>
<h2 id="next-stepswhat-will-the-next-blog-post-be-about">Next steps/What will the next blog post be about</h2>
<p>Next step will be trying to draw a cube, and if that is too easy a 8x8x8 space of cubes.</p>
</div>
</body>
                `
            },
            {
                id: 2,
                title: "Temp",
                date: "2025-09-15",
                tags: ["mathematics"],
                excerpt: "Temp",
                content: `
                    <h1>Temp</h1>
                    <div class="post-meta">
                        <span> September 15, 2025</span>
                        <span> temp, temp, temp</span>
                    </div>
                    <p>temp</p>
                    <h2>temp</h2>
                `
            },
            {
                id: 3,
                title: "Temp",
                date: "2025-09-15",
                tags: ["mathematics"],
                excerpt: "Temp",
                content: `
                    <h1>Temp</h1>
                    <div class="post-meta">
                        <span> September 15, 2025</span>
                        <span> temp, temp, temp</span>
                    </div>
                    <p>temp</p>
                    <h2>temp</h2>
                `
            },
            {
                id: 4,
                title: "Temp",
                date: "2025-09-15",
                tags: ["mathematics"],
                excerpt: "Temp",
                content: `
                    <h1>Temp</h1>
                    <div class="post-meta">
                        <span> September 15, 2025</span>
                        <span> temp, temp, temp</span>
                    </div>
                    <p>temp</p>
                    <h2>temp</h2>
                `
            },
            {
                id: 5,
                title: "Temp",
                date: "2025-09-15",
                tags: ["mathematics"],
                excerpt: "Temp",
                content: `
                    <h1>Temp</h1>
                    <div class="post-meta">
                        <span> September 15, 2025</span>
                        <span> temp, temp, temp</span>
                    </div>
                    <p>temp</p>
                    <h2>temp</h2>
                `
            },
            {
                id: 6,
                title: "Temp",
                date: "2025-09-15",
                tags: ["mathematics"],
                excerpt: "Temp",
                content: `
                    <h1>Temp</h1>
                    <div class="post-meta">
                        <span> September 15, 2025</span>
                        <span> temp, temp, temp</span>
                    </div>
                    <p>temp</p>
                    <h2>temp</h2>
                `
            },
        ];
        class KnowledgeGraph {
            constructor(posts) {
                this.canvas = document.getElementById('graph-canvas');
                this.ctx = this.canvas.getContext('2d');
                this.posts = posts;
                this.nodes = [];
                this.edges = [];
                
                this.camera = { x: 0, y: 0, zoom: 1 };
                this.isDragging = false;
                this.dragStart = { x: 0, y: 0 };
                this.hoveredNode = null;
                this.selectedNode = null;
                
                this.init();
            }
            
            init() {
                this.resizeCanvas();
                this.createNodes();
                this.createEdges();
                this.setupEventListeners();
                this.animate();
            }
            
            resizeCanvas() {
                this.canvas.width = this.canvas.offsetWidth;
                this.canvas.height = this.canvas.offsetHeight;
            }
            
            createNodes() {
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 2;
                const radius = Math.min(this.canvas.width, this.canvas.height) * 0.35;
                
                this.posts.forEach((post, i) => {
                    const angle = (i / this.posts.length) * Math.PI * 2;
                    this.nodes.push({
                        id: post.id,
                        x: centerX + Math.cos(angle) * radius,
                        y: centerY + Math.sin(angle) * radius,
                        vx: 0,
                        vy: 0,
                        radius: 20,
                        title: post.title,
                        tags: post.tags,
                        post: post
                    });
                });
            }
            
            createEdges() {
                for (let i = 0; i < this.nodes.length; i++) {
                    for (let j = i + 1; j < this.nodes.length; j++) {
                        const sharedTags = this.nodes[i].tags.filter(tag => 
                            this.nodes[j].tags.includes(tag)
                        );
                        
                        if (sharedTags.length > 0) {
                            this.edges.push({
                                from: this.nodes[i],
                                to: this.nodes[j],
                                strength: sharedTags.length,
                                sharedTags: sharedTags
                            });
                        }
                    }
                }
            }
            
            setupEventListeners() {
                this.canvas.addEventListener('mousedown', (e) => {
                    const rect = this.canvas.getBoundingClientRect();
                    const mouseX = (e.clientX - rect.left - this.camera.x) / this.camera.zoom;
                    const mouseY = (e.clientY - rect.top - this.camera.y) / this.camera.zoom;
                    
                    const clickedNode = this.nodes.find(node => {
                        const dx = node.x - mouseX;
                        const dy = node.y - mouseY;
                        return Math.sqrt(dx * dx + dy * dy) < node.radius;
                    });
                    
                    if (clickedNode) {
                        openReadingPanel(clickedNode.post);
                    } else {
                        this.isDragging = true;
                        this.dragStart = { x: e.clientX, y: e.clientY };
                    }
                });
                
                this.canvas.addEventListener('mousemove', (e) => {
                    if (this.isDragging) {
                        this.camera.x += e.clientX - this.dragStart.x;
                        this.camera.y += e.clientY - this.dragStart.y;
                        this.dragStart = { x: e.clientX, y: e.clientY };
                    } else {
                        // Check for hover
                        const rect = this.canvas.getBoundingClientRect();
                        const mouseX = (e.clientX - rect.left - this.camera.x) / this.camera.zoom;
                        const mouseY = (e.clientY - rect.top - this.camera.y) / this.camera.zoom;
                        
                        this.hoveredNode = this.nodes.find(node => {
                            const dx = node.x - mouseX;
                            const dy = node.y - mouseY;
                            return Math.sqrt(dx * dx + dy * dy) < node.radius;
                        }) || null;
                    }
                });
                
                this.canvas.addEventListener('mouseup', () => {
                    this.isDragging = false;
                });
                
                this.canvas.addEventListener('mouseleave', () => {
                    this.isDragging = false;
                });
                
                // Zoom controls
                document.getElementById('zoom-in').addEventListener('click', () => {
                    this.camera.zoom = Math.min(this.camera.zoom * 1.2, 3);
                });
                
                document.getElementById('zoom-out').addEventListener('click', () => {
                    this.camera.zoom = Math.max(this.camera.zoom / 1.2, 0.5);
                });
                
                document.getElementById('reset-view').addEventListener('click', () => {
                    this.camera = { x: 0, y: 0, zoom: 1 };
                });
                
                // Resize
                window.addEventListener('resize', () => this.resizeCanvas());
            }
            
            animate() {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                
                this.ctx.save();
                this.ctx.translate(this.camera.x, this.camera.y);
                this.ctx.scale(this.camera.zoom, this.camera.zoom);
                
                // Draw edges
                this.edges.forEach(edge => {
                    const isHighlighted = this.hoveredNode && 
                        (edge.from === this.hoveredNode || edge.to === this.hoveredNode);
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(edge.from.x, edge.from.y);
                    this.ctx.lineTo(edge.to.x, edge.to.y);
                    
                    if (isHighlighted) {
                        this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
                        this.ctx.lineWidth = 2;
                        this.ctx.shadowBlur = 10;
                        this.ctx.shadowColor = '#00f0ff';
                    } else {
                        this.ctx.strokeStyle = `rgba(0, 240, 255, ${0.1 + edge.strength * 0.1})`;
                        this.ctx.lineWidth = edge.strength;
                        this.ctx.shadowBlur = 0;
                    }
                    
                    this.ctx.stroke();
                });
                
                // Draw nodes
                this.nodes.forEach(node => {
                    const isHovered = node === this.hoveredNode;
                    
                    // Node circle
                    this.ctx.beginPath();
                    this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
                    
                    if (isHovered) {
                        this.ctx.fillStyle = '#ff006e';
                        this.ctx.shadowBlur = 20;
                        this.ctx.shadowColor = '#ff006e';
                    } else {
                        this.ctx.fillStyle = 'rgba(255, 0, 110, 0.6)';
                        this.ctx.shadowBlur = 5;
                        this.ctx.shadowColor = '#ff006e';
                    }
                    
                    this.ctx.fill();
                    
                    // Node border
                    this.ctx.strokeStyle = isHovered ? '#00f0ff' : '#ff006e';
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();
                    
                    // Label
                    if (isHovered) {
                        this.ctx.shadowBlur = 0;
                        this.ctx.fillStyle = '#ffffff';
                        this.ctx.font = 'bold 14px Rajdhani';
                        this.ctx.textAlign = 'center';
                        this.ctx.fillText(node.title, node.x, node.y - node.radius - 10);
                    }
                });
                
                this.ctx.restore();
                
                requestAnimationFrame(() => this.animate());
            }
        }

        let currentView = 'graph';
        let knowledgeGraph = null;

        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                
                document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                if (view === 'graph') {
                    document.getElementById('graph-container').style.display = 'block';
                    document.getElementById('list-container').classList.remove('active');
                    
                    if (!knowledgeGraph) {
                        knowledgeGraph = new KnowledgeGraph(blogPosts);
                    }
                } else {
                    document.getElementById('graph-container').style.display = 'none';
                    document.getElementById('list-container').classList.add('active');
                    renderListView();
                }
                
                currentView = view;
            });
        });

        function renderListView() {
            const container = document.getElementById('list-container');
            container.innerHTML = blogPosts.map(post => `
                <div class="post-card" onclick="openReadingPanel(blogPosts.find(p => p.id === ${post.id}))">
                    <h2>${post.title}</h2>
                    <div class="post-meta">
                        <span>📅 ${post.date}</span>
                    </div>
                    <p class="post-excerpt">${post.excerpt}</p>
                    <div class="post-tags">
                        ${post.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                </div>
            `).join('');
        }

        function openReadingPanel(post) {
            const panel = document.getElementById('reading-panel');
            const content = panel.querySelector('.post-content');
            content.innerHTML = post.content;
            panel.classList.add('open');
        }

        document.querySelector('.close-panel').addEventListener('click', () => {
            document.getElementById('reading-panel').classList.remove('open');
        });


        document.getElementById('search-input').addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            
            if (query === '') {
                if (currentView === 'list') {
                    renderListView();
                }
                return;
            }
            
            const filtered = blogPosts.filter(post => 
                post.title.toLowerCase().includes(query) ||
                post.excerpt.toLowerCase().includes(query) ||
                post.tags.some(tag => tag.toLowerCase().includes(query))
            );
            
            if (currentView === 'list') {
                const container = document.getElementById('list-container');
                container.innerHTML = filtered.map(post => `
                    <div class="post-card" onclick="openReadingPanel(blogPosts.find(p => p.id === ${post.id}))">
                        <h2>${post.title}</h2>
                        <div class="post-meta">
                            <span>📅 ${post.date}</span>
                        </div>
                        <p class="post-excerpt">${post.excerpt}</p>
                        <div class="post-tags">
                            ${post.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                    </div>
                `).join('');
            } else {
                knowledgeGraph.nodes.forEach(node => {
                    const matches = filtered.some(p => p.id === node.id);
                    node.highlighted = matches;
                });
            }
        });

        window.addEventListener('load', () => {
            knowledgeGraph = new KnowledgeGraph(blogPosts);
        });