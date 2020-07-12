
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.24.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var data = { summary:[ { company:"Valhalla",
          description:"A next-gen web development agency where business ideas get software answers",
          projects:[ { id:"home-workout-app",
              name:"Home Workout App",
              role:"Core Frontend, Full Stack",
              tech:[ "React",
                "Ionic 4",
                "Serverless Framework" ] },
            { id:"data-management-app",
              name:"Data Management App",
              role:"Core Frontend, Full Stack",
              tech:[ "React",
                "Express",
                "AWS DynamoDB" ] },
            { id:"data-management-app",
              name:"Data Management App",
              role:"Core Frontend, Full Stack",
              tech:[ "React",
                "Express",
                "AWS DynamoDB" ] },
            { id:"workout-player",
              name:"Workout Player",
              role:"Frontend",
              tech:[ "React" ] },
            { id:"fitness-app",
              name:"Fitness App",
              role:"Frontend, Full Stack",
              tech:[ "React",
                "Serverless Framework" ] } ] },
        { company:"Gortek",
          description:"A software company focused on developing software for small businesses and startups",
          projects:[ { id:"frontend-framework",
              name:"Frontend Framework",
              role:"Full Stack",
              tech:[ "React",
                "webpack",
                "Rollup",
                "Click" ] },
            { id:"photo-sharing-app",
              name:"Photo Sharing App",
              role:"Full Stack",
              tech:[ "React",
                "Django",
                "AWS S3",
                "MongoDB" ] },
            { id:"freelancing-web-app",
              name:"Freelancing Web App",
              role:"Full Stack",
              tech:[ "React",
                "AWS Amplify",
                "Python" ] },
            { id:"audit-app",
              name:"Audit App",
              role:"Core Frontend, Full Stack",
              tech:[ "React",
                "AWS Amplify",
                "Python" ] } ] } ] };

    var data$1 = { bio:"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas et ante neque. Aenean tincidunt ultrices lobortis. Aliquam erat volutpat.  Integer convallis dignissim elementum. Vestibulum magna nunc, vestibulum sit amet lorem nec, vehicula vehicula urna. Quisque auctor risus eget tempus luctus. Integer vulputate non tortor id sollicitudin.\\n\\nJust kidding! Here’s my real bio.\\n\\nI’m a self-taught software engineer who’s still working to become better each day. Complex projects excite me specially those that would squeeze out my creativity. I love solving problems but as much as possible, I want to make sure that the solutions I bring are clean, scalable, and well designed.\\n\\nI graduated with electronics engineering degree but I guess I just love creating software products. I still save up for my ambitious electronics projects though. \\n\\nI currently develop apps with React and NodeJS (AWS Lambda).",
      skill_set:[ "JavaScript",
        "Python",
        "Shell Script",
        "Object Oriented Programming",
        "HTML5/CSS3",
        "SAP ABAP",
        "Graphics Design" ],
      libraries_frameworks:[ "ReactJS",
        "AWS (Amplify, S3, DynamoDB, Lambda)",
        "Ionic 4, Capacitor, Cordova",
        "React Material-UI, TailwindCSS",
        "MongoDB, MongoDB Stitch",
        "Jest, Enzyme",
        "GraphQL",
        "GatsbyJS",
        "MeteorJS" ],
      tools:[ "Vim",
        "OSX, Linux",
        "Docker",
        "webpack, Rollup, Gulp",
        "yarn & npm",
        "Figma" ] };

    /* src/View.svelte generated by Svelte v3.24.0 */

    const { console: console_1 } = globals;
    const file = "src/View.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	return child_ctx;
    }

    function get_each_context_6(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[25] = list[i];
    	return child_ctx;
    }

    function get_each_context_5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[22] = list[i];
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	return child_ctx;
    }

    // (80:22) {#each project.tech as tech}
    function create_each_block_6(ctx) {
    	let span;
    	let t0;
    	let t1_value = /*tech*/ ctx[25] + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text("·");
    			t1 = text(t1_value);
    			t2 = text(" ");
    			set_style(span, "font-size", "12px");
    			add_location(span, file, 80, 24, 2170);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(span, t2);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_6.name,
    		type: "each",
    		source: "(80:22) {#each project.tech as tech}",
    		ctx
    	});

    	return block;
    }

    // (75:16) {#each work.projects as project}
    function create_each_block_5(ctx) {
    	let div1;
    	let div0;
    	let h5;
    	let t0_value = /*project*/ ctx[22].name.toUpperCase() + "";
    	let t0;
    	let t1;
    	let p;
    	let t2_value = /*project*/ ctx[22].role + "";
    	let t2;
    	let t3;
    	let t4;
    	let each_value_6 = /*project*/ ctx[22].tech;
    	validate_each_argument(each_value_6);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_6.length; i += 1) {
    		each_blocks[i] = create_each_block_6(get_each_context_6(ctx, each_value_6, i));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			h5 = element("h5");
    			t0 = text(t0_value);
    			t1 = space();
    			p = element("p");
    			t2 = text(t2_value);
    			t3 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t4 = space();
    			set_style(h5, "margin", "0");
    			add_location(h5, file, 77, 22, 1969);
    			set_style(p, "font-size", "12px");
    			add_location(p, file, 78, 22, 2048);
    			attr_dev(div0, "class", "project");
    			add_location(div0, file, 76, 20, 1925);
    			attr_dev(div1, "class", "project-item");
    			add_location(div1, file, 75, 18, 1878);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, h5);
    			append_dev(h5, t0);
    			append_dev(div0, t1);
    			append_dev(div0, p);
    			append_dev(p, t2);
    			append_dev(div0, t3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append_dev(div1, t4);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*work*/ 524288) {
    				each_value_6 = /*project*/ ctx[22].tech;
    				validate_each_argument(each_value_6);
    				let i;

    				for (i = 0; i < each_value_6.length; i += 1) {
    					const child_ctx = get_each_context_6(ctx, each_value_6, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_6(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_6.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_5.name,
    		type: "each",
    		source: "(75:16) {#each work.projects as project}",
    		ctx
    	});

    	return block;
    }

    // (70:10) {#each work.summary as work}
    function create_each_block_4(ctx) {
    	let div1;
    	let h2;
    	let t0_value = /*work*/ ctx[19].company.toUpperCase() + "";
    	let t0;
    	let t1;
    	let p;
    	let t2_value = /*work*/ ctx[19].description + "";
    	let t2;
    	let t3;
    	let div0;
    	let t4;
    	let each_value_5 = /*work*/ ctx[19].projects;
    	validate_each_argument(each_value_5);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_5.length; i += 1) {
    		each_blocks[i] = create_each_block_5(get_each_context_5(ctx, each_value_5, i));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			h2 = element("h2");
    			t0 = text(t0_value);
    			t1 = space();
    			p = element("p");
    			t2 = text(t2_value);
    			t3 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t4 = space();
    			add_location(h2, file, 71, 14, 1686);
    			add_location(p, file, 72, 14, 1738);
    			attr_dev(div0, "class", "projects-container");
    			add_location(div0, file, 73, 14, 1778);
    			add_location(div1, file, 70, 12, 1666);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h2);
    			append_dev(h2, t0);
    			append_dev(div1, t1);
    			append_dev(div1, p);
    			append_dev(p, t2);
    			append_dev(div1, t3);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append_dev(div1, t4);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*work*/ 524288) {
    				each_value_5 = /*work*/ ctx[19].projects;
    				validate_each_argument(each_value_5);
    				let i;

    				for (i = 0; i < each_value_5.length; i += 1) {
    					const child_ctx = get_each_context_5(ctx, each_value_5, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_5(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_5.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(70:10) {#each work.summary as work}",
    		ctx
    	});

    	return block;
    }

    // (114:10) {#each about.bio.split(/\\n/g) as para}
    function create_each_block_3(ctx) {
    	let p;
    	let t_value = /*para*/ ctx[16] + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			add_location(p, file, 114, 12, 3212);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(114:10) {#each about.bio.split(/\\\\n/g) as para}",
    		ctx
    	});

    	return block;
    }

    // (121:12) {#each about.skill_set as skill}
    function create_each_block_2(ctx) {
    	let li;
    	let t_value = /*skill*/ ctx[13] + "";
    	let t;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t = text(t_value);
    			add_location(li, file, 121, 14, 3411);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(121:12) {#each about.skill_set as skill}",
    		ctx
    	});

    	return block;
    }

    // (127:12) {#each about.libraries_frameworks as lib}
    function create_each_block_1(ctx) {
    	let li;
    	let t_value = /*lib*/ ctx[10] + "";
    	let t;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t = text(t_value);
    			add_location(li, file, 127, 14, 3593);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(127:12) {#each about.libraries_frameworks as lib}",
    		ctx
    	});

    	return block;
    }

    // (133:12) {#each about.tools as tool}
    function create_each_block(ctx) {
    	let li;
    	let t_value = /*tool*/ ctx[7] + "";
    	let t;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t = text(t_value);
    			add_location(li, file, 133, 14, 3738);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(133:12) {#each about.tools as tool}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div10;
    	let div1;
    	let div0;
    	let h50;
    	let t1;
    	let h51;
    	let t3;
    	let h52;
    	let t5;
    	let div9;
    	let div4;
    	let div2;
    	let h1;
    	let t7;
    	let h20;
    	let t9;
    	let div3;
    	let h53;
    	let t11;
    	let div6;
    	let div5;
    	let t12;
    	let div8;
    	let div7;
    	let p0;
    	let t14;
    	let p1;
    	let t16;
    	let div16;
    	let div11;
    	let h54;
    	let t18;
    	let div15;
    	let div14;
    	let div12;
    	let h21;
    	let t20;
    	let t21;
    	let div13;
    	let h40;
    	let t23;
    	let ul0;
    	let t24;
    	let h41;
    	let t26;
    	let ul1;
    	let t27;
    	let h42;
    	let t29;
    	let ul2;
    	let mounted;
    	let dispose;
    	let each_value_4 = data.summary;
    	validate_each_argument(each_value_4);
    	let each_blocks_4 = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks_4[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	let each_value_3 = data$1.bio.split(/\\n/g);
    	validate_each_argument(each_value_3);
    	let each_blocks_3 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_3[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	let each_value_2 = data$1.skill_set;
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value_1 = data$1.libraries_frameworks;
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = data$1.tools;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			div10 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h50 = element("h5");
    			h50.textContent = "ABOUT";
    			t1 = space();
    			h51 = element("h5");
    			h51.textContent = "WORK";
    			t3 = space();
    			h52 = element("h5");
    			h52.textContent = "CONTACT";
    			t5 = space();
    			div9 = element("div");
    			div4 = element("div");
    			div2 = element("div");
    			h1 = element("h1");
    			h1.textContent = "AJ CATARINA";
    			t7 = space();
    			h20 = element("h2");
    			h20.textContent = "Software Engineer";
    			t9 = space();
    			div3 = element("div");
    			h53 = element("h5");
    			h53.textContent = ">";
    			t11 = space();
    			div6 = element("div");
    			div5 = element("div");

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				each_blocks_4[i].c();
    			}

    			t12 = space();
    			div8 = element("div");
    			div7 = element("div");
    			p0 = element("p");
    			p0.textContent = "ajcatarina@outlook.com";
    			t14 = space();
    			p1 = element("p");
    			p1.textContent = "https://www.linkedin.com/in/ajcatarina/";
    			t16 = space();
    			div16 = element("div");
    			div11 = element("div");
    			h54 = element("h5");
    			h54.textContent = `${"<"}`;
    			t18 = space();
    			div15 = element("div");
    			div14 = element("div");
    			div12 = element("div");
    			h21 = element("h2");
    			h21.textContent = "BIO";
    			t20 = space();

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].c();
    			}

    			t21 = space();
    			div13 = element("div");
    			h40 = element("h4");
    			h40.textContent = "SKILL SET";
    			t23 = space();
    			ul0 = element("ul");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t24 = space();
    			h41 = element("h4");
    			h41.textContent = "LIBRARIES & FRAMEWORKS";
    			t26 = space();
    			ul1 = element("ul");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t27 = space();
    			h42 = element("h4");
    			h42.textContent = "TOOLS";
    			t29 = space();
    			ul2 = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h50, "class", "nav");
    			toggle_class(h50, "nav-active", /*currentMainView*/ ctx[0] === 1);
    			add_location(h50, file, 30, 8, 541);
    			attr_dev(h51, "class", "nav");
    			toggle_class(h51, "nav-active", /*currentMainView*/ ctx[0] === 2);
    			add_location(h51, file, 37, 8, 701);
    			attr_dev(h52, "class", "nav");
    			toggle_class(h52, "nav-active", /*currentMainView*/ ctx[0] === 3);
    			add_location(h52, file, 44, 8, 860);
    			attr_dev(div0, "class", "l-pad");
    			add_location(div0, file, 29, 6, 513);
    			attr_dev(div1, "id", "main-nav");
    			add_location(div1, file, 28, 4, 487);
    			add_location(h1, file, 56, 10, 1220);
    			add_location(h20, file, 57, 10, 1251);
    			attr_dev(div2, "class", "v-center");
    			set_style(div2, "flex", "1");
    			add_location(div2, file, 55, 8, 1170);
    			attr_dev(h53, "class", "nav");
    			add_location(h53, file, 60, 10, 1362);
    			attr_dev(div3, "class", "v-center");
    			set_style(div3, "margin-right", "80px");
    			add_location(div3, file, 59, 8, 1301);
    			attr_dev(div4, "class", "main-view flex w-full");
    			toggle_class(div4, "hidden-above", /*currentMainView*/ ctx[0] > 1);
    			add_location(div4, file, 54, 6, 1085);
    			attr_dev(div5, "class", "scroll-view");
    			add_location(div5, file, 68, 8, 1589);
    			attr_dev(div6, "class", "main-view");
    			toggle_class(div6, "hidden-above", /*currentMainView*/ ctx[0] > 2);
    			toggle_class(div6, "hidden-below", /*currentMainView*/ ctx[0] < 2);
    			add_location(div6, file, 63, 6, 1444);
    			add_location(p0, file, 96, 10, 2634);
    			add_location(p1, file, 97, 10, 2674);
    			attr_dev(div7, "class", "v-center");
    			set_style(div7, "flex", "1");
    			add_location(div7, file, 95, 8, 2584);
    			attr_dev(div8, "class", "main-view flex w-full");
    			toggle_class(div8, "hidden-above", /*currentMainView*/ ctx[0] > 3);
    			toggle_class(div8, "hidden-below", /*currentMainView*/ ctx[0] < 3);
    			add_location(div8, file, 90, 6, 2427);
    			attr_dev(div9, "id", "main-views");
    			attr_dev(div9, "class", "w-full");
    			add_location(div9, file, 53, 4, 1042);
    			attr_dev(div10, "id", "main-container");
    			toggle_class(div10, "hidden-left", /*subViewOpen*/ ctx[1]);
    			add_location(div10, file, 27, 2, 425);
    			attr_dev(h54, "class", "nav");
    			add_location(h54, file, 107, 6, 2954);
    			attr_dev(div11, "class", "v-center");
    			set_style(div11, "margin-left", "80px");
    			set_style(div11, "min-width", "160px");
    			add_location(div11, file, 106, 4, 2880);
    			add_location(h21, file, 112, 10, 3137);
    			set_style(div12, "flex", "1");
    			add_location(div12, file, 111, 8, 3104);
    			add_location(h40, file, 118, 10, 3318);
    			add_location(ul0, file, 119, 10, 3347);
    			add_location(h41, file, 124, 10, 3474);
    			add_location(ul1, file, 125, 10, 3520);
    			add_location(h42, file, 130, 10, 3654);
    			add_location(ul2, file, 131, 10, 3679);
    			set_style(div13, "flex", "1");
    			set_style(div13, "margin-left", "40px");
    			add_location(div13, file, 117, 8, 3267);
    			attr_dev(div14, "class", "sub-view-content flex w-full");
    			add_location(div14, file, 110, 6, 3053);
    			attr_dev(div15, "class", "scroll-view");
    			add_location(div15, file, 109, 4, 3021);
    			attr_dev(div16, "class", "sub-view flex w-full");
    			toggle_class(div16, "hidden-right", !/*subViewOpen*/ ctx[1] || /*currentMainView*/ ctx[0] !== 1);
    			add_location(div16, file, 102, 2, 2771);
    			attr_dev(main, "class", "svelte-byrher");
    			add_location(main, file, 26, 0, 416);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div10);
    			append_dev(div10, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h50);
    			append_dev(div0, t1);
    			append_dev(div0, h51);
    			append_dev(div0, t3);
    			append_dev(div0, h52);
    			append_dev(div10, t5);
    			append_dev(div10, div9);
    			append_dev(div9, div4);
    			append_dev(div4, div2);
    			append_dev(div2, h1);
    			append_dev(div2, t7);
    			append_dev(div2, h20);
    			append_dev(div4, t9);
    			append_dev(div4, div3);
    			append_dev(div3, h53);
    			append_dev(div9, t11);
    			append_dev(div9, div6);
    			append_dev(div6, div5);

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				each_blocks_4[i].m(div5, null);
    			}

    			append_dev(div9, t12);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, p0);
    			append_dev(div7, t14);
    			append_dev(div7, p1);
    			append_dev(main, t16);
    			append_dev(main, div16);
    			append_dev(div16, div11);
    			append_dev(div11, h54);
    			append_dev(div16, t18);
    			append_dev(div16, div15);
    			append_dev(div15, div14);
    			append_dev(div14, div12);
    			append_dev(div12, h21);
    			append_dev(div12, t20);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].m(div12, null);
    			}

    			append_dev(div14, t21);
    			append_dev(div14, div13);
    			append_dev(div13, h40);
    			append_dev(div13, t23);
    			append_dev(div13, ul0);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(ul0, null);
    			}

    			append_dev(div13, t24);
    			append_dev(div13, h41);
    			append_dev(div13, t26);
    			append_dev(div13, ul1);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(ul1, null);
    			}

    			append_dev(div13, t27);
    			append_dev(div13, h42);
    			append_dev(div13, t29);
    			append_dev(div13, ul2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul2, null);
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(h50, "click", /*click_handler*/ ctx[4], false, false, false),
    					listen_dev(h51, "click", /*click_handler_1*/ ctx[5], false, false, false),
    					listen_dev(h52, "click", /*click_handler_2*/ ctx[6], false, false, false),
    					listen_dev(h53, "click", /*toggleSubview*/ ctx[3], false, false, false),
    					listen_dev(h54, "click", /*toggleSubview*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*currentMainView*/ 1) {
    				toggle_class(h50, "nav-active", /*currentMainView*/ ctx[0] === 1);
    			}

    			if (dirty & /*currentMainView*/ 1) {
    				toggle_class(h51, "nav-active", /*currentMainView*/ ctx[0] === 2);
    			}

    			if (dirty & /*currentMainView*/ 1) {
    				toggle_class(h52, "nav-active", /*currentMainView*/ ctx[0] === 3);
    			}

    			if (dirty & /*currentMainView*/ 1) {
    				toggle_class(div4, "hidden-above", /*currentMainView*/ ctx[0] > 1);
    			}

    			if (dirty & /*work*/ 524288) {
    				each_value_4 = data.summary;
    				validate_each_argument(each_value_4);
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks_4[i]) {
    						each_blocks_4[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_4[i] = create_each_block_4(child_ctx);
    						each_blocks_4[i].c();
    						each_blocks_4[i].m(div5, null);
    					}
    				}

    				for (; i < each_blocks_4.length; i += 1) {
    					each_blocks_4[i].d(1);
    				}

    				each_blocks_4.length = each_value_4.length;
    			}

    			if (dirty & /*currentMainView*/ 1) {
    				toggle_class(div6, "hidden-above", /*currentMainView*/ ctx[0] > 2);
    			}

    			if (dirty & /*currentMainView*/ 1) {
    				toggle_class(div6, "hidden-below", /*currentMainView*/ ctx[0] < 2);
    			}

    			if (dirty & /*currentMainView*/ 1) {
    				toggle_class(div8, "hidden-above", /*currentMainView*/ ctx[0] > 3);
    			}

    			if (dirty & /*currentMainView*/ 1) {
    				toggle_class(div8, "hidden-below", /*currentMainView*/ ctx[0] < 3);
    			}

    			if (dirty & /*subViewOpen*/ 2) {
    				toggle_class(div10, "hidden-left", /*subViewOpen*/ ctx[1]);
    			}

    			if (dirty & /*about*/ 0) {
    				each_value_3 = data$1.bio.split(/\\n/g);
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks_3[i]) {
    						each_blocks_3[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_3[i] = create_each_block_3(child_ctx);
    						each_blocks_3[i].c();
    						each_blocks_3[i].m(div12, null);
    					}
    				}

    				for (; i < each_blocks_3.length; i += 1) {
    					each_blocks_3[i].d(1);
    				}

    				each_blocks_3.length = each_value_3.length;
    			}

    			if (dirty & /*about*/ 0) {
    				each_value_2 = data$1.skill_set;
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(ul0, null);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_2.length;
    			}

    			if (dirty & /*about*/ 0) {
    				each_value_1 = data$1.libraries_frameworks;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(ul1, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*about*/ 0) {
    				each_value = data$1.tools;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul2, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*subViewOpen, currentMainView*/ 3) {
    				toggle_class(div16, "hidden-right", !/*subViewOpen*/ ctx[1] || /*currentMainView*/ ctx[0] !== 1);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks_4, detaching);
    			destroy_each(each_blocks_3, detaching);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	console.log(data$1);
    	let currentMainView = 1;
    	let subViewOpen = false;

    	function goTo(view) {
    		$$invalidate(0, currentMainView = view);
    	}

    	function toggleSubview(view) {
    		$$invalidate(1, subViewOpen = !subViewOpen);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<View> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("View", $$slots, []);
    	const click_handler = () => goTo(1);
    	const click_handler_1 = () => goTo(2);
    	const click_handler_2 = () => goTo(3);

    	$$self.$capture_state = () => ({
    		work: data,
    		about: data$1,
    		currentMainView,
    		subViewOpen,
    		goTo,
    		toggleSubview
    	});

    	$$self.$inject_state = $$props => {
    		if ("currentMainView" in $$props) $$invalidate(0, currentMainView = $$props.currentMainView);
    		if ("subViewOpen" in $$props) $$invalidate(1, subViewOpen = $$props.subViewOpen);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		currentMainView,
    		subViewOpen,
    		goTo,
    		toggleSubview,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class View extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "View",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const view = new View({
    	target: document.body,
    });

    return view;

}());
//# sourceMappingURL=bundle.js.map
