const blogPosts = [
    {
        id: 1,
        title: "GPU-CPU shenanigans",
        date: "2025-09-15",
        tags: ["Rust"],
        excerpt: "",
        content: `
                    <h1 id="how-to-make-the-gpu-and-cpu-trade-when-they-don’t-want-to-need-other-name">How to make the GPU and CPU trade when they don’t want to (Need other name)</h1>
<h2 id="tldr">TLDR</h2>
<p>Transferring data to the GPU from the CPU is way harder than it seems, but when you see the parts step by step it’s not that bad.</p>
<h2 id="why-are-we-doing-this">Why are we doing this?</h2>
<p>Two years ago I optimistically began working on my block-game with the intention of building it up bottom up from first principles. Not relying on any game engine and graphics engine. About two weeks later I finally built the Hello World equivalent of graphics programming: Drawing a triangle, and was so exhausted by the complexity of what I was doing that I put this <strong>project on hiatus</strong>.</p>
<p>It’s 2025 now, and I’ve grown a lot more comfortable in complexity. My programming skills have in general also improved by a lot, so it was <strong>time to continue what I started</strong>.</p>
<h2 id="the-biggest-problem-to-fix">The biggest problem to fix</h2>
<p>The biggest problem the code had, was <strong>hardcoded variables</strong>. It might’ve drawn a triangle on the screen, but the coordinates (and color values) of the edges of that triangle were hardcoded in a shader file that compiled it to machine code manually. Which basically meant that if you wanted to change the coordinates of those edges, you’d have to:</p>
<ul>
<li>manually change them in that file,</li>
<li>compile them to machine code with a command line script,</li>
<li>and then rerun the rust code.</li>
</ul>
<p>I hope you realize that this wouldn’t work for a graphics engine. In a game when we break a block, we need that block to disappear. Right now that isn’t possible since all coordinates are fixed until we restart our ‘game’.</p>
<h2 id="the-setupthe-plan">The plan</h2>
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
<li>Acquire the address of where we will copy our data in shared memory.</li>
<li>Copy the data.</li>
<li>Throw away the address for optimization’s sake.</li>
</ul>
<p>I hope you now see that this is harder that it seems. Let us get to it.</p>
<h2 id="vertices">Vertices</h2>
<p>So, right now our vertex(coordinate) data is hardcoded in our shader file:</p>
<pre class=" language-glsl"><code class="prism  language-glsl"><span class="token preprocessor builtin">#version</span> <span class="token number">450</span>

<span class="token keyword">layout</span><span class="token punctuation">(</span>location <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">)</span> <span class="token keyword">out</span> <span class="token keyword">vec3</span> fragColor<span class="token punctuation">;</span>

<span class="token keyword">vec2</span> positions<span class="token punctuation">[</span><span class="token number">3</span><span class="token punctuation">]</span> <span class="token operator">=</span> <span class="token keyword">vec2</span><span class="token punctuation">[</span><span class="token punctuation">]</span><span class="token punctuation">(</span>
	<span class="token keyword">vec2</span><span class="token punctuation">(</span><span class="token number">0.0</span><span class="token punctuation">,</span> <span class="token operator">-</span><span class="token number">0.5</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
	<span class="token keyword">vec2</span><span class="token punctuation">(</span><span class="token number">0.5</span><span class="token punctuation">,</span> <span class="token number">0.5</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
	<span class="token keyword">vec2</span><span class="token punctuation">(</span><span class="token operator">-</span><span class="token number">0.5</span><span class="token punctuation">,</span> <span class="token number">0.5</span><span class="token punctuation">)</span>
<span class="token punctuation">)</span><span class="token punctuation">;</span>

<span class="token keyword">vec3</span> colors<span class="token punctuation">[</span><span class="token number">3</span><span class="token punctuation">]</span> <span class="token operator">=</span> <span class="token keyword">vec3</span><span class="token punctuation">[</span><span class="token punctuation">]</span><span class="token punctuation">(</span>
	<span class="token keyword">vec3</span><span class="token punctuation">(</span><span class="token number">1.0</span><span class="token punctuation">,</span> <span class="token number">0.0</span><span class="token punctuation">,</span> <span class="token number">0.0</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
	<span class="token keyword">vec3</span><span class="token punctuation">(</span><span class="token number">0.0</span><span class="token punctuation">,</span> <span class="token number">1.0</span><span class="token punctuation">,</span> <span class="token number">0.0</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
	<span class="token keyword">vec3</span><span class="token punctuation">(</span><span class="token number">0.0</span><span class="token punctuation">,</span> <span class="token number">0.0</span><span class="token punctuation">,</span> <span class="token number">1.0</span><span class="token punctuation">)</span>
<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token keyword">void</span> <span class="token function">main</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>
    gl_Position <span class="token operator">=</span> <span class="token keyword">vec4</span><span class="token punctuation">(</span>positions<span class="token punctuation">[</span>gl_VertexIndex<span class="token punctuation">]</span><span class="token punctuation">,</span> <span class="token number">0.0</span><span class="token punctuation">,</span> <span class="token number">1.0</span><span class="token punctuation">)</span><span class="token punctuation">;</span>
    fragColor <span class="token operator">=</span> colors<span class="token punctuation">[</span>gl_VertexIndex<span class="token punctuation">]</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>
</code></pre>
<p>Observe the vectors <strong>vec2</strong> and <strong>vec3</strong> that are defined, they represent the triangle that is currently drawn on the screen when the program is run. Our first step is then to take this representation, and put it in our rust code:</p>
<pre class=" language-rust"><code class="prism  language-rust"><span class="token keyword">pub</span> <span class="token keyword">struct</span> Vertex  <span class="token punctuation">{</span>
	pos<span class="token punctuation">:</span>  <span class="token punctuation">[</span>f32<span class="token punctuation">;</span>  <span class="token number">3</span><span class="token punctuation">]</span><span class="token punctuation">,</span>
	color<span class="token punctuation">:</span>  <span class="token punctuation">[</span>f32<span class="token punctuation">;</span>  <span class="token number">3</span><span class="token punctuation">]</span><span class="token punctuation">,</span>
<span class="token punctuation">}</span>

<span class="token keyword">const</span> VERTICES<span class="token punctuation">:</span> <span class="token punctuation">[</span>Vertex<span class="token punctuation">;</span> <span class="token number">3</span><span class="token punctuation">]</span> <span class="token operator">=</span> <span class="token punctuation">[</span>
    Vertex <span class="token punctuation">{</span>
        pos<span class="token punctuation">:</span> <span class="token punctuation">[</span><span class="token number">0.0</span><span class="token punctuation">,</span> <span class="token operator">-</span><span class="token number">0.5</span><span class="token punctuation">]</span><span class="token punctuation">,</span>
        color<span class="token punctuation">:</span> <span class="token punctuation">[</span><span class="token number">1.0</span><span class="token punctuation">,</span> <span class="token number">0.0</span><span class="token punctuation">,</span> <span class="token number">0.0</span><span class="token punctuation">]</span><span class="token punctuation">,</span>
    <span class="token punctuation">}</span><span class="token punctuation">,</span>
    Vertex <span class="token punctuation">{</span>
        pos<span class="token punctuation">:</span> <span class="token punctuation">[</span><span class="token number">0.5</span><span class="token punctuation">,</span> <span class="token number">0.5</span><span class="token punctuation">]</span><span class="token punctuation">,</span>
        color<span class="token punctuation">:</span> <span class="token punctuation">[</span><span class="token number">0.0</span><span class="token punctuation">,</span> <span class="token number">1.0</span><span class="token punctuation">,</span> <span class="token number">0.0</span><span class="token punctuation">]</span><span class="token punctuation">,</span>
    <span class="token punctuation">}</span><span class="token punctuation">,</span>
    Vertex <span class="token punctuation">{</span>
        pos<span class="token punctuation">:</span> <span class="token punctuation">[</span><span class="token operator">-</span><span class="token number">0.5</span><span class="token punctuation">,</span> <span class="token number">0.5</span><span class="token punctuation">]</span><span class="token punctuation">,</span>
        color<span class="token punctuation">:</span> <span class="token punctuation">[</span><span class="token number">0.0</span><span class="token punctuation">,</span> <span class="token number">0.0</span><span class="token punctuation">,</span> <span class="token number">1.0</span><span class="token punctuation">]</span><span class="token punctuation">,</span>
    <span class="token punctuation">}</span><span class="token punctuation">,</span>
<span class="token punctuation">]</span><span class="token punctuation">;</span>
</code></pre>
<p>You might wonder how this changes anything, since now the triangle is hard coded in our rust code instead of the glsl shader code. The difference is that we can easily change the rust code to dynamically generate vertices, for the shader file that is just not possible. Since we want to get our code working in the first place, it’s easier to just start with the hard coded version. When everything works properly, we can adjust how the vertices are created.</p>
<h2 id="the-buffer">The Buffer</h2>
<p>Imagine you are very very rich and trying to find a new house for the weekends. Obviously you are so busy with drinking tea that you do not have the time (or the knowledge, you’re uber rich after all, everyone does everything for you so you lack the basic skills and knowledge to do simple tasks the peasants can easily do) to search on housing websites for your humble new abode. So you call your handy butler and give him a specification of exactly what you want this new house to be. How many <span class="katex--inline"><span class="katex"><span class="katex-mathml"><math xmlns="http://www.w3.org/1998/Math/MathML"><semantics><mrow><msup><mi>m</mi><mn>2</mn></msup></mrow><annotation encoding="application/x-tex">m^2</annotation></semantics></math></span><span class="katex-html" aria-hidden="true"><span class="base"><span class="strut" style="height: 0.814108em; vertical-align: 0em;"></span><span class="mord"><span class="mord mathnormal">m</span><span class="msupsub"><span class="vlist-t"><span class="vlist-r"><span class="vlist" style="height: 0.814108em;"><span class="" style="top: -3.063em; margin-right: 0.05em;"><span class="pstrut" style="height: 2.7em;"></span><span class="sizing reset-size6 size3 mtight"><span class="mord mtight">2</span></span></span></span></span></span></span></span></span></span></span></span> it needs to have, how many rooms, that it needs a sauna and a swimming pool. This specification is exactly what a buffer is, <strong>a container that holds all the information about what data the GPU will receive and what that data will be used for</strong>.</p>
<p>Our Vertices is the data we want to give to the GPU, but the GPU obviously needs to know how much of its memory it should reserve for them. Hence we need to find out how much memory, in bytes, the Vertices take up:</p>
<pre class=" language-rust"><code class="prism  language-rust"><span class="token keyword">let</span> buffer_size_in_bytes <span class="token operator">=</span> <span class="token punctuation">(</span>VERTICES<span class="token punctuation">.</span><span class="token function">len</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">*</span> size_of<span class="token punctuation">:</span><span class="token punctuation">:</span><span class="token operator">&lt;</span>Vertex<span class="token operator">&gt;</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token keyword">as</span> u64<span class="token punctuation">;</span>
</code></pre>
<p>Then we specify a few other tidbits about our buffer. Imagine you have a whiteboard in your office at work, and there are multiple teams working on different projects that’d like to use the whiteboard. If we’d specify</p>
<pre class=" language-rust"><code class="prism  language-rust">vk<span class="token punctuation">:</span><span class="token punctuation">:</span>SharingMode<span class="token punctuation">:</span><span class="token punctuation">:</span>CONCURRENT
</code></pre>
<p>it would mean that each team can use the whiteboard at any moment whenever they’d want. So if your team is currently working on a project and writing on the whiteboard, Derek’s team could just waltz in, grab the whiteboard and start writing their own stuff on it. Maybe even writing over your own stuff, that definitely seems like a bad idea. That is why we use</p>
<pre class=" language-rust"><code class="prism  language-rust">vk<span class="token punctuation">:</span><span class="token punctuation">:</span>SharingMode<span class="token punctuation">:</span><span class="token punctuation">:</span>EXCLUSIVE
</code></pre>
<p>which is exactly the opposite: Only 1 team can use the whiteboard at any time, they have to take turns and verbally hand over the right of using the whiteboard before the other team can use it. You’d most likely think: <em>Why does concurrent mode even exist</em>, it apparently only has niche use cases where it does shine, but not in our case.</p>
<p>Furthermore, obviously our buffer, is a vertex buffer. Other specifications are not necessary at the moment, so we will leave them in their default state:</p>
<pre class=" language-rust"><code class="prism  language-rust"><span class="token keyword">let</span> buffer_create_info <span class="token operator">=</span> vk<span class="token punctuation">:</span><span class="token punctuation">:</span>BufferCreateInfo <span class="token punctuation">{</span>
	size<span class="token punctuation">:</span> buffer_size_in_bytes<span class="token punctuation">,</span>
	usage<span class="token punctuation">:</span> vk<span class="token punctuation">:</span><span class="token punctuation">:</span>BufferUsageFlags<span class="token punctuation">:</span><span class="token punctuation">:</span>VERTEX_BUFFER<span class="token punctuation">,</span>
	sharing_mode<span class="token punctuation">:</span> vk<span class="token punctuation">:</span><span class="token punctuation">:</span>SharingMode<span class="token punctuation">:</span><span class="token punctuation">:</span>EXCLUSIVE<span class="token punctuation">,</span>
	<span class="token punctuation">..</span>Default<span class="token punctuation">:</span><span class="token punctuation">:</span><span class="token function">default</span><span class="token punctuation">(</span><span class="token punctuation">)</span>
<span class="token punctuation">}</span><span class="token punctuation">;</span>
</code></pre>
<p>And then we just call Vulkan’s own function to create the buffer:</p>
<pre class=" language-rust"><code class="prism  language-rust"><span class="token keyword">let</span> buffer <span class="token operator">=</span> <span class="token keyword">unsafe</span><span class="token punctuation">{</span> vulkan_logical_device<span class="token punctuation">.</span><span class="token function">create_buffer</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>buffer_create_info<span class="token punctuation">,</span>  None<span class="token punctuation">)</span>? <span class="token punctuation">}</span><span class="token punctuation">;</span>
</code></pre>
<h2 id="memory-requirements">Memory requirements</h2>
<p>Next we need to figure out what type of memory is necessary for all the specifications we just made, hence we give our buffer to a Vulkan function that then spits out all the memory requirements:</p>
<pre class=" language-rust"><code class="prism  language-rust"><span class="token keyword">let</span> buffer_mem_requirements <span class="token operator">=</span> <span class="token keyword">unsafe</span><span class="token punctuation">{</span> vulkan_logical_device<span class="token punctuation">.</span><span class="token function">get_buffer_memory_requirements</span><span class="token punctuation">(</span>buffer<span class="token punctuation">)</span> <span class="token punctuation">}</span><span class="token punctuation">;</span>
</code></pre>
<h2 id="finding-a-suitable-memory-type">Finding a suitable memory type</h2>
<p>WIP</p>
<pre class=" language-rust"><code class="prism  language-rust"><span class="token keyword">let</span> memory_properties <span class="token operator">=</span> instance<span class="token punctuation">.</span><span class="token function">get_physical_device_memory_properties</span><span class="token punctuation">(</span>vulkan_application_data<span class="token punctuation">.</span>physical_device<span class="token punctuation">)</span><span class="token punctuation">;</span>
</code></pre>
<pre class=" language-rust"><code class="prism  language-rust"><span class="token keyword">let</span> allowed_memory_types <span class="token operator">=</span> buffer_mem_requirements<span class="token punctuation">.</span>memory_type_bits<span class="token punctuation">;</span>
</code></pre>
<pre class=" language-rust"><code class="prism  language-rust"><span class="token keyword">let</span> desired_properties <span class="token operator">=</span> 
vk<span class="token punctuation">:</span><span class="token punctuation">:</span>MemoryPropertyFlags<span class="token punctuation">:</span><span class="token punctuation">:</span>HOST_VISIBLE <span class="token operator">|</span> vk<span class="token punctuation">:</span><span class="token punctuation">:</span>MemoryPropertyFlags<span class="token punctuation">:</span><span class="token punctuation">:</span>HOST_COHERENT<span class="token punctuation">;</span>
</code></pre>
<pre class=" language-rust"><code class="prism  language-rust"><span class="token keyword">let</span> buffer_memory_type_index <span class="token operator">=</span> <span class="token function">find_memory_type</span><span class="token punctuation">(</span>
	<span class="token operator">&amp;</span>memory_properties<span class="token punctuation">,</span>  
	allowed_memory_types<span class="token punctuation">,</span>  
	desired_properties<span class="token punctuation">)</span>?<span class="token punctuation">;</span>
</code></pre>
<pre class=" language-rust"><code class="prism  language-rust"><span class="token keyword">fn</span> <span class="token function">find_memory_type</span><span class="token punctuation">(</span>
	memory_properties<span class="token punctuation">:</span> <span class="token operator">&amp;</span>vk<span class="token punctuation">:</span><span class="token punctuation">:</span>PhysicalDeviceMemoryProperties<span class="token punctuation">,</span>
	allowed_memory_types<span class="token punctuation">:</span> u32<span class="token punctuation">,</span>
	requested_properties<span class="token punctuation">:</span> vk<span class="token punctuation">:</span><span class="token punctuation">:</span>MemoryPropertyFlags<span class="token punctuation">,</span>
	<span class="token punctuation">)</span> <span class="token punctuation">-&gt;</span> anyhow<span class="token punctuation">:</span><span class="token punctuation">:</span>Result<span class="token operator">&lt;</span>u32<span class="token operator">&gt;</span> <span class="token punctuation">{</span>

	<span class="token keyword">let</span> number_of_different_memory_types <span class="token operator">=</span> memory_properties<span class="token punctuation">.</span>memory_type_count<span class="token punctuation">;</span> 
	<span class="token keyword">for</span> memory_type_index <span class="token keyword">in</span> <span class="token number">0</span><span class="token punctuation">..</span>number_of_different_memory_types <span class="token punctuation">{</span>
	
		<span class="token keyword">let</span> memory_type_is_allowed <span class="token operator">=</span> <span class="token punctuation">(</span>allowed_memory_types <span class="token operator">&amp;</span> <span class="token punctuation">(</span><span class="token number">1</span> <span class="token operator">&lt;&lt;</span> memory_type_index<span class="token punctuation">)</span><span class="token punctuation">)</span> <span class="token operator">!=</span> <span class="token number">0</span><span class="token punctuation">;</span>
		<span class="token keyword">if</span> memory_type_is_allowed <span class="token punctuation">{</span>
			<span class="token keyword">let</span> memory_type_properties <span class="token operator">=</span> memory_properties<span class="token punctuation">.</span>memory_types<span class="token punctuation">[</span>memory_type_index <span class="token keyword">as</span>  usize<span class="token punctuation">]</span><span class="token punctuation">.</span>property_flags<span class="token punctuation">;</span>
			
		<span class="token keyword">let</span> has_all_desired_properties <span class="token operator">=</span> <span class="token punctuation">(</span>memory_type_properties <span class="token operator">&amp;</span> requested_properties<span class="token punctuation">)</span>  
				<span class="token operator">==</span> requested_properties<span class="token punctuation">;</span>
				
		<span class="token keyword">if</span> has_all_desired_properties <span class="token punctuation">{</span>
				<span class="token keyword">return</span> <span class="token function">Ok</span><span class="token punctuation">(</span>memory_type_index<span class="token punctuation">)</span><span class="token punctuation">;</span>
		<span class="token punctuation">}</span>
	<span class="token punctuation">}</span>
<span class="token punctuation">}</span>
anyhow<span class="token punctuation">:</span><span class="token punctuation">:</span><span class="token function">bail!</span><span class="token punctuation">(</span>
	<span class="token string">"Failed to find a suitable memory type for requested properties: {:?}"</span><span class="token punctuation">,</span>
	requested_properties
	<span class="token punctuation">)</span><span class="token punctuation">;</span>
<span class="token punctuation">}</span>
</code></pre>
<h2 id="allocating-the-gpu-memory">Allocating the GPU memory</h2>
<p>WIP</p>
<pre class=" language-rust"><code class="prism  language-rust"><span class="token keyword">let</span> allocation_info <span class="token operator">=</span> vk<span class="token punctuation">:</span><span class="token punctuation">:</span>MemoryAllocateInfo <span class="token punctuation">{</span>
	s_type<span class="token punctuation">:</span> vk<span class="token punctuation">:</span><span class="token punctuation">:</span>StructureType<span class="token punctuation">:</span><span class="token punctuation">:</span>MEMORY_ALLOCATE_INFO<span class="token punctuation">,</span>
	next<span class="token punctuation">:</span> std<span class="token punctuation">:</span><span class="token punctuation">:</span>ptr<span class="token punctuation">:</span><span class="token punctuation">:</span><span class="token function">null</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">,</span>
	allocation_size<span class="token punctuation">:</span> buffer_mem_requirements<span class="token punctuation">.</span>size<span class="token punctuation">,</span>
	memory_type_index<span class="token punctuation">:</span> buffer_memory_type_index<span class="token punctuation">,</span>
<span class="token punctuation">}</span><span class="token punctuation">;</span>
</code></pre>
<pre class=" language-rust"><code class="prism  language-rust"><span class="token keyword">let</span> allocated_memory <span class="token operator">=</span> <span class="token keyword">unsafe</span> <span class="token punctuation">{</span> vulkan_logical_device<span class="token punctuation">.</span><span class="token function">allocate_memory</span><span class="token punctuation">(</span><span class="token operator">&amp;</span>allocation_info<span class="token punctuation">,</span> None<span class="token punctuation">)</span>? <span class="token punctuation">}</span><span class="token punctuation">;</span>
</code></pre>
<h2 id="binding-the-buffer-to-allocated-memory">Binding the buffer to allocated memory</h2>
<p>WIP</p>
<pre class=" language-rust"><code class="prism  language-rust"><span class="token keyword">unsafe</span> <span class="token punctuation">{</span> vulkan_logical_device<span class="token punctuation">.</span><span class="token function">bind_buffer_memory</span><span class="token punctuation">(</span>buffer<span class="token punctuation">,</span> allocated_memory<span class="token punctuation">,</span> <span class="token number">0</span><span class="token punctuation">)</span>? <span class="token punctuation">}</span><span class="token punctuation">;</span>
</code></pre>
<h2 id="mapping-the-memory-cpu-pointer">Mapping the memory (CPU pointer)</h2>
<p>WIP</p>
<pre class=" language-rust"><code class="prism  language-rust"><span class="token keyword">let</span> pointer_to_mapped_memory <span class="token operator">=</span> <span class="token keyword">unsafe</span> <span class="token punctuation">{</span>
	vulkan_logical_device<span class="token punctuation">.</span><span class="token function">map_memory</span><span class="token punctuation">(</span>
	allocated_memory<span class="token punctuation">,</span>
	vk<span class="token punctuation">:</span><span class="token punctuation">:</span>DeviceSize<span class="token punctuation">:</span><span class="token punctuation">:</span><span class="token function">default</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">,</span>  <span class="token comment">// Start at the beginning of the allocation</span>
	buffer_mem_requirements<span class="token punctuation">.</span>size<span class="token punctuation">,</span>  <span class="token comment">// Map the entire allocation</span>
	vk<span class="token punctuation">:</span><span class="token punctuation">:</span>MemoryMapFlags<span class="token punctuation">:</span><span class="token punctuation">:</span><span class="token function">empty</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">,</span>  <span class="token comment">// No special flags needed</span>
	<span class="token punctuation">)</span>?
<span class="token punctuation">}</span><span class="token punctuation">;</span>

</code></pre>
<h2 id="copying-the-data">Copying the data</h2>
<p>WIP</p>
<pre class=" language-rust"><code class="prism  language-rust"><span class="token keyword">let</span> vertex_pointer <span class="token operator">=</span> pointer_to_mapped_memory <span class="token keyword">as</span> <span class="token operator">*</span><span class="token keyword">mut</span> T<span class="token punctuation">;</span>
</code></pre>
<pre class=" language-rust"><code class="prism  language-rust"><span class="token keyword">unsafe</span> <span class="token punctuation">{</span>
	<span class="token function">copy_nonoverlapping</span><span class="token punctuation">(</span>
	VERTICES<span class="token punctuation">.</span><span class="token function">as_ptr</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">,</span>  <span class="token comment">// Source: CPU memory containing our data</span>
	vertex_pointer<span class="token punctuation">,</span>  <span class="token comment">// Destination: Mapped pointer to GPU memory</span>
	VERTICES<span class="token punctuation">.</span><span class="token function">len</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">,</span>  <span class="token comment">// Number of elements to copy</span>
	<span class="token punctuation">)</span>
<span class="token punctuation">}</span><span class="token punctuation">;</span>
</code></pre>
<h2 id="unmapping-the-memory">Unmapping the memory</h2>
<p>Conclusively, we need to unmap the pointer to the GPU-CPU shared memory that we still have,</p>
<pre class=" language-rust"><code class="prism  language-rust"><span class="token keyword">unsafe</span><span class="token punctuation">{</span> vulkan_logical_device<span class="token punctuation">.</span><span class="token function">unmap_memory</span><span class="token punctuation">(</span>allocated_memory<span class="token punctuation">)</span> <span class="token punctuation">}</span><span class="token punctuation">;</span>
</code></pre>
<p>which is done for optimization reasons that I myself still don’t fully understand yet. Unmapping the pointer means we don’t have the address anymore of where we put our data and hence can’t access it anymore. Now in the background the GPU will, whenever it seems fit, copy the data in the GPU-CPU shared memory to its own GPU memory and use it in exactly the way that we described in our buffer.</p>
<h2 id="recap">Recap</h2>
<h2 id="next-stepswhat-will-the-next-blog-post-be-about">Next steps/What will the next blog post be about</h2>
<p>Next step will be trying to draw a cube, but for us to be able to see the cube we need a working camera system.</p>


                `
    },
    /*{
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
    */
];
function renderPostsList() {
    const container = document.getElementById('posts-list');
    container.innerHTML = blogPosts.map(post => `
        <div class="post-item" onclick="showPost(${post.id})">
            <h3>${post.title}</h3>
            <div class="post-meta">${post.date}</div>
            <p class="post-excerpt">${post.excerpt}</p>
            <div class="post-tags">
                ${post.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
        </div>
    `).join('');
}

function showPost(postId) {
    const post = blogPosts.find(p => p.id === postId);
    if (!post) return;

    document.getElementById('home-view').style.display = 'none';
    document.getElementById('post-view').style.display = 'block';
    document.getElementById('post-content').innerHTML = `<div class="stackedit__html">${post.content}</div>`;
    window.scrollTo(0, 0);
}

function showHome() {
    document.getElementById('home-view').style.display = 'block';
    document.getElementById('post-view').style.display = 'none';
    window.scrollTo(0, 0);
}

renderPostsList();