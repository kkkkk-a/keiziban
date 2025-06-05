class Layer {
    constructor(current_array_idx, app_instance, app_container, canvas_width, canvas_height, default_name, is_background = false) {
        this.app = app_instance;
        this.current_array_idx = current_array_idx;
        this.name = default_name;
        this.previous_name_on_edit = default_name;
        this.visible = true;
        this.active = false;
        this.is_background = is_background;
        this.bg_image = null;
        this.bg_opacity = 1.0;
        this.bg_color = "#FFFFFF"; // デフォルト背景色

        this.canvas = document.createElement("canvas");
        this.app_container = app_container; // PaintApp will append this to DOM if it's the main container for canvases
        this.ctx = this.canvas.getContext("2d");
        this.resize(canvas_width, canvas_height);

        this.elem = document.createElement("div");
        this.elem.className = "layer-item";

        this.vis_toggle = document.createElement("input");
        this.vis_toggle.type = "checkbox";
        this.vis_toggle.checked = true;
        this.vis_toggle.title = "表示/非表示";
        if (is_background) this.vis_toggle.title = "背景レイヤーの表示/非表示 (非表示で背景透過)";
        this.elem.appendChild(this.vis_toggle);

        this.text_span = document.createElement("span");
        this.text_span.className = "layer-name-span";
        this.text_span.textContent = this.name;
        this.elem.appendChild(this.text_span);

        if (is_background) {
            const type_indicator = document.createElement("span");
            type_indicator.className = "layer-type-indicator";
            type_indicator.textContent = "(背景)";
            this.elem.appendChild(type_indicator);
        }

        this.buttons_container = document.createElement("div");
        this.buttons_container.className = "layer-item-buttons";
        this.elem.appendChild(this.buttons_container);

        this.vis_toggle.addEventListener("change", (e) => {
            this.visible = this.vis_toggle.checked;
            this.canvas.style.display = this.visible ? "block" : "none";
            if (this.is_background) this.app.update_container_background();
        });

        this.elem.addEventListener("click", (e) => {
            const is_control = e.target.tagName === "BUTTON" || (e.target.tagName === "INPUT" && e.target.type === "checkbox") || this.text_span.classList.contains("editing");
            if (!is_control && !this.is_background) this.app.set_active_layer(this.current_array_idx);
        });

        if (!is_background) {
            this.text_span.addEventListener("dblclick", this._handle_name_edit_start.bind(this));
            
            this.del_btn = document.createElement("button"); this.del_btn.innerHTML = "️"; this.del_btn.title = "削除";
            this.del_btn.addEventListener("click", this._handle_delete.bind(this)); this.buttons_container.appendChild(this.del_btn);
            
            this.up_btn = document.createElement("button"); this.up_btn.innerHTML = "⬆️"; this.up_btn.title = "上へ";
            this.up_btn.addEventListener("click", this._handle_move_up.bind(this)); this.buttons_container.appendChild(this.up_btn);
            
            this.down_btn = document.createElement("button"); this.down_btn.innerHTML = "⬇️"; this.down_btn.title = "下へ";
            this.down_btn.addEventListener("click", this._handle_move_down.bind(this)); this.buttons_container.appendChild(this.down_btn);
        } else {
            this.text_span.style.cursor = "default";
        }
    }

    resize(new_width, new_height) {
        this.canvas.width = new_width;
        this.canvas.height = new_height;
        if (this.is_background) {
            this.draw_bg();
        }
    }

    get_image_data() {
        if (this.canvas.width > 0 && this.canvas.height > 0) {
            try {
                return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            } catch (e) {
                console.error(`Error in get_image_data for layer ${this.name}: ${e}`);
                return null;
            }
        }
        return null;
    }

    restore_from_image_data(image_data) {
        if (image_data && this.canvas.width === image_data.width && this.canvas.height === image_data.height) {
            try {
                this.ctx.putImageData(image_data, 0, 0);
            } catch (e) {
                console.error(`Error in restore_from_image_data for layer ${this.name}: ${e}`);
            }
        } else if (image_data) {
            console.warn(`Warning: ImageData size mismatch for layer ${this.name}. Clearing layer.`);
            this.clear();
        }
    }

    _handle_name_edit_start(e) {
        e.stopPropagation();
        if (this.is_background) return;
        this.previous_name_on_edit = this.name;
        this.text_span.setAttribute("contenteditable", "true");
        this.text_span.classList.add("editing");
        this.text_span.focus();
        document.execCommand('selectAll', false, null); 

        this._bound_handle_name_edit_end = this._handle_name_edit_end.bind(this);
        this._bound_handle_name_edit_keydown = this._handle_name_edit_keydown.bind(this);

        this.text_span.addEventListener("blur", this._bound_handle_name_edit_end);
        this.text_span.addEventListener("keydown", this._bound_handle_name_edit_keydown);
    }

    _handle_name_edit_end(e) {
        e.stopPropagation();
        this.text_span.removeAttribute("contenteditable");
        this.text_span.classList.remove("editing");
        const new_name = this.text_span.textContent.trim();
        if (!new_name) {
            this.name = this.previous_name_on_edit;
            alert("レイヤー名は空にできません。");
        } else {
            this.name = new_name;
        }
        this.text_span.textContent = this.name;

        if (this._bound_handle_name_edit_end) {
          this.text_span.removeEventListener("blur", this._bound_handle_name_edit_end);
          delete this._bound_handle_name_edit_end;
        }
        if (this._bound_handle_name_edit_keydown) {
          this.text_span.removeEventListener("keydown", this._bound_handle_name_edit_keydown);
          delete this._bound_handle_name_edit_keydown;
        }
    }

    _handle_name_edit_keydown(e) {
        e.stopPropagation();
        const key = e.key;
        if (key === "Enter") { e.preventDefault(); this.text_span.blur(); }
        else if (key === "Escape") { e.preventDefault(); this.text_span.textContent = this.previous_name_on_edit; this.text_span.blur(); }
    }

    _handle_delete(e) { e.stopPropagation(); this.app.delete_layer(this.current_array_idx); }
    _handle_move_up(e) { e.stopPropagation(); this.app.move_layer_up(this.current_array_idx); }
    _handle_move_down(e) { e.stopPropagation(); this.app.move_layer_down(this.current_array_idx); }

    update_button_states(num_total_layers) {
        if (this.is_background) return;
        this.up_btn.disabled = (this.current_array_idx === num_total_layers - 1);
        this.down_btn.disabled = (this.current_array_idx === 1);
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.is_background) {
            this.bg_image = null;
            this.draw_bg(); 
        }
    }

    draw_bg() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (!this.is_background) return;

        this.ctx.globalAlpha = this.bg_opacity;
        if (this.bg_image) {
            this.ctx.drawImage(this.bg_image, 0, 0, this.canvas.width, this.canvas.height);
        } else {
            this.ctx.fillStyle = this.bg_color;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
        this.ctx.globalAlpha = 1.0;
    }

    set_bg_image(img_element) {
        if (!this.is_background) return;
        this.bg_image = img_element;
        this.draw_bg();
    }

    set_bg_color(color) {
        if (!this.is_background) return;
        this.bg_color = color;
        if (!this.bg_image) { 
            this.draw_bg();
        }
    }
}


class PaintApp {
    constructor() {
        // ... (既存の要素取得は変更なし) ...
        this.width_input = document.getElementById("canvas-width-input");
        this.height_input = document.getElementById("canvas-height-input");
        this.thickness_label = document.getElementById("thickness-label");
        this.thickness_value_span = document.getElementById("thickness-value");
        this.bg_opacity_value_span = document.getElementById("bg-opacity-value");
        
        this.canvas_main_container = document.getElementById("canvas-container");
        if (!this.canvas_main_container) {
            console.error("CRITICAL: canvas-container not found in DOM!");
            alert("アプリケーションの初期化に失敗しました。canvas-containerが見つかりません。");
            return; 
        }
        
        this.width = parseInt(this.width_input.value);
        this.height = parseInt(this.height_input.value);
        
        this.canvas_main_container.style.width = `${this.width}px`;
        this.canvas_main_container.style.height = `${this.height}px`;
        // ★★★ スマホでの描画ずれを防ぐためにCSS touch-action を設定
        this.canvas_main_container.style.touchAction = "none";


        this.color_input = document.getElementById("color-picker");
        this.thickness_input = document.getElementById("thickness");
        this.mode_select = document.getElementById("mode-select");
        this.text_input_field = document.getElementById("text-input-field");
        this.font_family_select = document.getElementById("font-family-select");
        this.vertical_text_checkbox = document.getElementById("vertical-text-checkbox");
        this.text_options_container = document.getElementById("text-options-container");

        this.clear_btn = document.getElementById("clear-btn");
        this.save_btn = document.getElementById("save-btn");
        this.add_layer_btn = document.getElementById("add-layer-btn");
        this.resize_canvas_btn = document.getElementById("resize-canvas-btn");
        this.bg_upload_input = document.getElementById("bg-upload");
        this.bg_opacity_slider = document.getElementById("bg-opacity");
        this.layer_list_ui_container = document.getElementById("layer-list");
        this.fill_shape_checkbox = document.getElementById("fill-shape-checkbox");
        this.shape_options_container = document.getElementById("shape-options-container");
        this.save_format_select = document.getElementById("save-format-select");
        this.quality_control_container = document.getElementById("quality-control-container");
        this.quality_slider = document.getElementById("quality-slider");
        this.quality_value_span = document.getElementById("quality-value");

        this.show_grid_checkbox = document.getElementById("show-grid-checkbox");
        this.grid_spacing_input = document.getElementById("grid-spacing-input");
        this.grid_angle_slider = document.getElementById("grid-angle-slider");
        this.grid_angle_value_span = document.getElementById("grid-angle-value");

        this.undo_btn = document.getElementById("undo-btn");
        this.redo_btn = document.getElementById("redo-btn");

        this.bg_color_picker = document.getElementById("bg-color-picker");
        this.clear_bg_image_btn = document.getElementById("clear-bg-image-btn");

        this.layers = [];
        this.active_layer_idx = null;
        this.drawing = false;
        this.start_pos = null;
        this.triangle_points = [];

        this.undo_stack = [];
        this.redo_stack = [];
        this.MAX_HISTORY = 30;

        this.grid_canvas = document.createElement("canvas");
        this.grid_canvas.id = "grid-canvas";
        this.grid_canvas.style.cssText = "position:absolute;top:0;left:0;z-index:1;pointer-events:none;";
        this.canvas_main_container.appendChild(this.grid_canvas);
        this.grid_ctx = this.grid_canvas.getContext("2d");
        this.grid_canvas.width = this.width; this.grid_canvas.height = this.height;

        this.preview_canvas = document.createElement("canvas");
        this.preview_canvas.id = "preview-canvas";
        this.preview_canvas.style.cssText = "position:absolute;top:0;left:0;z-index:999;pointer-events:none;";
        this.canvas_main_container.appendChild(this.preview_canvas);
        this.preview_ctx = this.preview_canvas.getContext("2d");
        this.preview_canvas.width = this.width; this.preview_canvas.height = this.height;

        const bg_layer_obj = new Layer(0, this, this.canvas_main_container, this.width, this.height, "背景", true);
        bg_layer_obj.bg_color = this.bg_color_picker.value; 
        this.canvas_main_container.appendChild(bg_layer_obj.canvas);
        this.layers.push(bg_layer_obj);
        bg_layer_obj.draw_bg(); 

        this.non_bg_layer_counter = 0;
        this.init_layers(1);

        // ... (既存のイベントリスナーは変更なし、ただしレイヤーへの描画イベントリスナーは後述のメソッドでまとめて登録) ...
        this.clear_btn.addEventListener("click", this.clear_all.bind(this));
        this.save_btn.addEventListener("click", this.save_image.bind(this));
        this.add_layer_btn.addEventListener("click", this.add_new_layer_action.bind(this));
        this.resize_canvas_btn.addEventListener("click", this.handle_resize_canvas_button.bind(this));
        this.bg_upload_input.addEventListener("change", this.handle_bg_upload.bind(this));
        this.bg_opacity_slider.addEventListener("input", this.change_bg_opacity.bind(this));
        this.mode_select.addEventListener("change", this._update_ui_for_mode.bind(this));
        this.thickness_input.addEventListener("input", this._update_thickness_value.bind(this));
        this.save_format_select.addEventListener("change", this._update_save_options_ui.bind(this));
        this.quality_slider.addEventListener("input", this._update_quality_value.bind(this));
        this.show_grid_checkbox.addEventListener("change", this.toggle_grid_visibility.bind(this));
        this.grid_spacing_input.addEventListener("input", this.redraw_grid_on_change.bind(this));
        this.grid_angle_slider.addEventListener("input", this.redraw_grid_on_change.bind(this));
        this.undo_btn.addEventListener("click", this.undo_action.bind(this));
        this.redo_btn.addEventListener("click", this.redo_action.bind(this));
        this.bg_color_picker.addEventListener("input", this.change_bg_color.bind(this)); 
        this.clear_bg_image_btn.addEventListener("click", this.clear_background_image.bind(this));
        
        document.addEventListener("keydown", this.handle_keydown.bind(this));
        // ... (残りの初期化呼び出しは変更なし) ...
        this._refresh_layer_ui_and_indices();
        this._update_ui_for_mode();
        this.update_container_background();
        this._update_thickness_value();
        this.change_bg_opacity(); 
        this._update_save_options_ui();
        this.draw_grid();
        this._update_history_buttons_state();
        
        if (this.layers.length > 1) this.set_active_layer(1);
        else this.set_active_layer(null);
    }

    // ★★★ 座標取得ヘルパーメソッド
    getEventCoordinates(event) {
        let x, y;
        const canvasRect = event.target.getBoundingClientRect(); // event.target は canvas 要素のはず

        if (event.touches && event.touches.length > 0) {
            // タッチイベントの場合
            x = event.touches[0].clientX - canvasRect.left;
            y = event.touches[0].clientY - canvasRect.top;
        } else {
            // マウスイベントの場合
            x = event.offsetX;
            y = event.offsetY;
        }
        return { x, y };
    }


    // ★★★ 描画イベントリスナー登録の共通化
    _addDrawingEventListeners(canvasElement) {
        // マウスイベント
        canvasElement.addEventListener("mousedown", this.start_draw_handler.bind(this));
        canvasElement.addEventListener("mousemove", this.draw_move_handler.bind(this));
        canvasElement.addEventListener("mouseup", this.stop_draw_handler.bind(this));
        canvasElement.addEventListener("mouseleave", this.stop_draw_handler.bind(this));

        // タッチイベント
        canvasElement.addEventListener("touchstart", this.start_draw_handler.bind(this), { passive: false });
        canvasElement.addEventListener("touchmove", this.draw_move_handler.bind(this), { passive: false });
        canvasElement.addEventListener("touchend", this.stop_draw_handler.bind(this));
        canvasElement.addEventListener("touchcancel", this.stop_draw_handler.bind(this));
    }

    // ... (handle_keydown から update_container_background までは変更なし) ...
    handle_keydown(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            this.undo_action();
        } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'Z' && e.shiftKey))) {
            e.preventDefault();
            this.redo_action();
        }
    }

    _record_undo_state() {
        if (this.active_layer_idx === null || this.layers[this.active_layer_idx].is_background) {
            return;
        }
        const active_layer = this.layers[this.active_layer_idx];
        const current_image_data = active_layer.get_image_data();
        if (current_image_data) {
            this.undo_stack.push({
                layer_idx: this.active_layer_idx,
                image_data: current_image_data
            });
            if (this.undo_stack.length > this.MAX_HISTORY) {
                this.undo_stack.shift();
            }
            this.redo_stack = [];
            this._update_history_buttons_state();
        }
    }

    undo_action(e = null) {
        if (!this.undo_stack.length) {
            console.log("Undo stack is empty.");
            return;
        }
        
        const last_state = this.undo_stack.pop();
        const target_layer_idx = last_state.layer_idx;
        
        if (!(target_layer_idx >= 0 && target_layer_idx < this.layers.length)) {
            console.warn(`Invalid layer index in undo stack: ${target_layer_idx}`);
            this._update_history_buttons_state(); return;
        }

        const target_layer = this.layers[target_layer_idx];
        
        const current_data_for_redo = target_layer.get_image_data();
        if (current_data_for_redo) {
            this.redo_stack.push({
                layer_idx: target_layer_idx,
                image_data: current_data_for_redo
            });
        }

        target_layer.restore_from_image_data(last_state.image_data);
        console.log(`Undo: Restored layer ${target_layer.name}`);
        this._update_history_buttons_state();
    }

    redo_action(e = null) {
        if (!this.redo_stack.length) {
            console.log("Redo stack is empty.");
            return;
        }

        const next_state = this.redo_stack.pop();
        const target_layer_idx = next_state.layer_idx;

        if (!(target_layer_idx >= 0 && target_layer_idx < this.layers.length)) {
            console.warn(`Invalid layer index in redo stack: ${target_layer_idx}`);
            this._update_history_buttons_state(); return;
        }
            
        const target_layer = this.layers[target_layer_idx];

        const current_data_for_undo = target_layer.get_image_data();
        if (current_data_for_undo) {
            this.undo_stack.push({
                layer_idx: target_layer_idx,
                image_data: current_data_for_undo
            });
            if (this.undo_stack.length > this.MAX_HISTORY) this.undo_stack.shift();
        }

        target_layer.restore_from_image_data(next_state.image_data);
        console.log(`Redo: Restored layer ${target_layer.name}`);
        this._update_history_buttons_state();
    }

    _update_history_buttons_state() {
        this.undo_btn.disabled = !this.undo_stack.length;
        this.redo_btn.disabled = !this.redo_stack.length;
    }

    toggle_grid_visibility(e = null) {
        this.draw_grid();
    }

    redraw_grid_on_change(e = null) {
        if (e && e.target.id === "grid-angle-slider") {
           this.grid_angle_value_span.textContent = this.grid_angle_slider.value;
        }
        this.draw_grid();
    }

    draw_grid() {
        const ctx = this.grid_ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        if (!this.show_grid_checkbox.checked) {
            return;
        }

        const spacing = parseInt(this.grid_spacing_input.value);
        const angle_deg = parseInt(this.grid_angle_slider.value);
        const angle_rad = angle_deg * Math.PI / 180;
        
        const grid_color = "rgba(200, 200, 200, 0.5)";

        ctx.save();
        ctx.strokeStyle = grid_color;
        ctx.lineWidth = 1;

        const center_x = this.width / 2;
        const center_y = this.height / 2;
        ctx.translate(center_x, center_y);
        ctx.rotate(angle_rad);
        ctx.translate(-center_x, -center_y);
        
        const max_dim = Math.sqrt(this.width**2 + this.height**2) * 1.5;
        const start_coord = -max_dim / 2;
        const end_coord = max_dim / 2;
        
        const num_lines_x = Math.floor(max_dim / spacing);
        for (let i = -Math.floor(num_lines_x / 2); i <= Math.ceil(num_lines_x / 2); i++) {
            const x = center_x + i * spacing;
            ctx.beginPath();
            ctx.moveTo(x, start_coord + center_y);
            ctx.lineTo(x, end_coord + center_y);
            ctx.stroke();
        }

        const num_lines_y = Math.floor(max_dim / spacing);
        for (let i = -Math.floor(num_lines_y / 2); i <= Math.ceil(num_lines_y / 2); i++) {
            const y = center_y + i * spacing;
            ctx.beginPath();
            ctx.moveTo(start_coord + center_x, y);
            ctx.lineTo(end_coord + center_x, y);
            ctx.stroke();
        }
            
        ctx.restore();
    }

    _update_thickness_value(e = null) {
        this.thickness_value_span.textContent = this.thickness_input.value;
        this._update_ui_for_mode(); 
    }

    _update_quality_value(e = null) {
        this.quality_value_span.textContent = parseFloat(this.quality_slider.value).toFixed(2);
    }

    _update_save_options_ui(e = null) {
        const fmt = this.save_format_select.value;
        this.quality_control_container.style.display = (fmt === "jpeg" || fmt === "webp") ? "inline-flex" : "none";
        this._update_quality_value(); 
    }

    update_container_background() {
        const bg_l = this.layers[0];
        this.canvas_main_container.style.background = "transparent"; 
        if (!bg_l.visible) { 
             this.canvas_main_container.style.background = "url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27 width%3D%2720%27 height%3D%2720%27%3E%3Cpath d%3D%27M0 10h10V0h10v10H10v10H0z%27 fill%3D%27%23eee%27/%3E%3Cpath d%3D%27M10 20h10V10h-10V0H0v10h10z%27 fill%3D%27%23ccc%27/%3E%3C%2Fsvg%3E')";
        }
    }
    
    _update_ui_for_mode(e = null) {
        const mode = this.mode_select.value;
        
        if (mode === "text") {
            this.thickness_label.childNodes.item(0).textContent = "文字サイズ: ";
        } else {
            this.thickness_label.childNodes.item(0).textContent = "太さ: ";
        }

        let cursor_style = "crosshair";
        if (mode === "text") cursor_style = "text";
        else if (!["pen", "eraser", "line", "ellipse", "rectangle", "triangle"].includes(mode)) cursor_style = "default";
        
        let active_canvas_element = null;
        if (this.active_layer_idx !== null && this.active_layer_idx < this.layers.length && !this.layers[this.active_layer_idx].is_background) {
            active_canvas_element = this.layers[this.active_layer_idx].canvas;
        }
        
        this.layers.forEach(layer => {
            if (!layer.is_background) layer.canvas.style.cursor = "default";
        });
        this.canvas_main_container.style.cursor = "default"; 

        if (active_canvas_element) active_canvas_element.style.cursor = cursor_style;

        this.shape_options_container.style.display = ["ellipse", "rectangle", "triangle"].includes(mode) ? "flex" : "none";
        this.text_options_container.style.display = (mode === "text") ? "flex" : "none";
        
        if (this.drawing) { 
            this.preview_ctx.clearRect(0, 0, this.width, this.height);
            this.drawing = false; this.start_pos = null; this.triangle_points = [];
        }
    }


    init_layers(count) {
        for (let i = 0; i < count; i++) {
            this._add_layer_internal();
        }
    }

    _add_layer_internal() {
        const new_idx = this.layers.length; 
        this.non_bg_layer_counter++;
        const name = `レイヤー ${this.non_bg_layer_counter}`;
        const layer = new Layer(new_idx, this, this.canvas_main_container, this.width, this.height, name);
        
        this.canvas_main_container.appendChild(layer.canvas); 
        this.layers.push(layer);

        // ★★★ 描画イベントリスナーを登録
        this._addDrawingEventListeners(layer.canvas);
    }

    add_new_layer_action(e = null) {
        const new_idx = this.layers.length;
        this.non_bg_layer_counter++;
        const name = `レイヤー ${this.non_bg_layer_counter}`;
        const layer = new Layer(new_idx, this, this.canvas_main_container, this.width, this.height, name);
        
        this.canvas_main_container.appendChild(layer.canvas);
        this.layers.push(layer);
        
        // ★★★ 描画イベントリスナーを登録
        this._addDrawingEventListeners(layer.canvas);
        
        this._refresh_layer_ui_and_indices();
        this.set_active_layer(new_idx); 
    }

    _refresh_layer_ui_and_indices() {
        this.layer_list_ui_container.innerHTML = ""; 
        for (let i = this.layers.length - 1; i >= 0; i--) {
            const layer = this.layers[i];
            layer.current_array_idx = i; 
            layer.canvas.style.zIndex = i.toString();
            layer.text_span.textContent = layer.name; 
            if (!layer.is_background) {
                layer.update_button_states(this.layers.length);
            }
            this.layer_list_ui_container.appendChild(layer.elem);
            layer.elem.classList.toggle("active", i === this.active_layer_idx && !layer.is_background);
        }
    }

    set_active_layer(idx_to_activate) {
        if (this.active_layer_idx !== null && this.active_layer_idx < this.layers.length) {
            const old_layer = this.layers[this.active_layer_idx];
            if (old_layer && !old_layer.is_background) {
                old_layer.active = false;
                old_layer.elem.classList.remove("active");
                old_layer.canvas.style.pointerEvents = "none";
            }
        }

        const is_valid = (idx_to_activate !== null && idx_to_activate >= 0 && idx_to_activate < this.layers.length) && 
                         (this.layers[idx_to_activate] && !this.layers[idx_to_activate].is_background);


        if (!is_valid) {
            this.active_layer_idx = null;
            this._update_ui_for_mode();
            return;
        }
        
        this.active_layer_idx = idx_to_activate;
        const new_active_layer = this.layers[idx_to_activate];
        new_active_layer.active = true;
        new_active_layer.elem.classList.add("active");
        new_active_layer.canvas.style.pointerEvents = "auto";
        this._update_ui_for_mode();
    }

    handle_resize_canvas_button(e = null) {
        try {
            const w = parseInt(this.width_input.value);
            const h = parseInt(this.height_input.value);
            if (w < 50 || h < 50) { alert("最小サイズは50x50pxです。"); return; }
            if (confirm(`${w}x${h}に変更しますか？(描画内容はクリアされます)`)) {
                this.resize_all_canvases(w, h);
                this.undo_stack = [];
                this.redo_stack = [];
                this._update_history_buttons_state();
            }
        } catch (error) {
            alert("幅と高さには数値を入力してください。");
        }
    }

    resize_all_canvases(new_width, new_height) {
        this.width = new_width;
        this.height = new_height;
        this.width_input.value = new_width.toString();
        this.height_input.value = new_height.toString();

        this.canvas_main_container.style.width = `${new_width}px`;
        this.canvas_main_container.style.height = `${new_height}px`;
        
        this.grid_canvas.width = new_width; this.grid_canvas.height = new_height;
        this.preview_canvas.width = new_width; this.preview_canvas.height = new_height;
        
        this.layers.forEach(layer_obj => layer_obj.resize(new_width, new_height));
        this.draw_grid();
        console.log(`リサイズ: ${new_width}x${new_height}。描画クリア。`);
    }

    start_draw_handler(e) {
        // ★★★ タッチイベントでページのスクロールを抑制
        if (e.type.startsWith('touch')) {
            e.preventDefault();
        }

        if (this.active_layer_idx === null || this.layers[this.active_layer_idx].is_background) return;
        
        const mode = this.mode_select.value;
        const active_layer = this.layers[this.active_layer_idx];
        const ctx = active_layer.ctx;

        this._record_undo_state(); 
        
        this.drawing = true;
        // ★★★ 座標取得をヘルパーメソッド経由に
        const coords = this.getEventCoordinates(e);
        this.start_pos = { x: coords.x, y: coords.y };
        this.triangle_points = [];

        if (mode === "pen" || mode === "eraser") {
            ctx.beginPath(); ctx.moveTo(this.start_pos.x, this.start_pos.y);
        } else if (mode === "triangle") {
            this.triangle_points.push(this.start_pos);
        } else if (mode === "text") {
            const text_content = this.text_input_field.value.trim();
            if (text_content) {
                ctx.fillStyle = this.color_input.value;
                const font_size = parseInt(this.thickness_input.value);
                const selected_font_family = this.font_family_select.value;
                const is_vertical = this.vertical_text_checkbox.checked;
                ctx.font = `${font_size}px ${selected_font_family}`;
                ctx.textBaseline = is_vertical ? "top" : "alphabetic";
                
                if (is_vertical) {
                    const line_height = font_size * 1.2;
                    for (let i = 0; i < text_content.length; i++) {
                        ctx.fillText(text_content[i], this.start_pos.x, this.start_pos.y + (i * line_height));
                    }
                } else {
                    ctx.fillText(text_content, this.start_pos.x, this.start_pos.y);
                }
            }
            this.drawing = false; this.start_pos = null; 
        }
    }
      
    draw_move_handler(e) {
        // ★★★ タッチイベントでページのスクロールを抑制
        if (e.type.startsWith('touch')) {
            e.preventDefault();
        }

        if (!this.drawing || this.active_layer_idx === null || this.layers[this.active_layer_idx].is_background) return;

        // ★★★ 座標取得をヘルパーメソッド経由に
        const coords = this.getEventCoordinates(e);
        const current_x = coords.x;
        const current_y = coords.y;

        const mode = this.mode_select.value;
        const color = this.color_input.value;
        const thickness = parseInt(this.thickness_input.value);
        const should_fill = this.fill_shape_checkbox.checked;

        if (mode === "pen" || mode === "eraser") {
            const ctx = this.layers[this.active_layer_idx].ctx;
            ctx.globalCompositeOperation = (mode === "pen") ? "source-over" : "destination-out";
            ctx.strokeStyle = (mode === "pen") ? color : "rgba(0,0,0,1)"; 
            ctx.lineWidth = thickness; ctx.lineCap = "round"; ctx.lineJoin = "round";
            ctx.lineTo(current_x, current_y); ctx.stroke();
        } else if (["line", "ellipse", "rectangle", "triangle"].includes(mode) && this.start_pos) {
            const pctx = this.preview_ctx;
            pctx.clearRect(0, 0, this.width, this.height);
            pctx.strokeStyle = color; pctx.fillStyle = color; pctx.lineWidth = thickness;
            pctx.beginPath();

            if (mode === "line") {
                pctx.moveTo(this.start_pos.x, this.start_pos.y); pctx.lineTo(current_x, current_y);
                pctx.stroke();
            } else if (mode === "ellipse") {
                const cx = (this.start_pos.x + current_x) / 2;
                const cy = (this.start_pos.y + current_y) / 2;
                const rx = Math.abs(current_x - this.start_pos.x) / 2;
                const ry = Math.abs(current_y - this.start_pos.y) / 2;
                if (rx > 0 && ry > 0) pctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
                if (should_fill) pctx.fill(); else pctx.stroke();
            } else if (mode === "rectangle") {
                const rect_x = Math.min(this.start_pos.x, current_x);
                const rect_y = Math.min(this.start_pos.y, current_y);
                const rect_w = Math.abs(current_x - this.start_pos.x);
                const rect_h = Math.abs(current_y - this.start_pos.y);
                if (should_fill) pctx.fillRect(rect_x, rect_y, rect_w, rect_h);
                else pctx.strokeRect(rect_x, rect_y, rect_w, rect_h);
            } else if (mode === "triangle") {
                if (this.triangle_points.length === 1) {
                    const v1 = this.triangle_points[0];
                    const v2 = { x: current_x, y: current_y };
                    const v3 = { x: v1.x, y: current_y }; 
                    pctx.moveTo(v1.x, v1.y); pctx.lineTo(v2.x, v2.y); pctx.lineTo(v3.x, v3.y); pctx.closePath();
                    if (should_fill) pctx.fill(); else pctx.stroke();
                }
            }
        }
    }

    stop_draw_handler(e) {
        // ★★★ タッチイベントでページのスクロールを抑制 (touchend/touchcancelでも念のため)
        if (e.type.startsWith('touch')) {
             e.preventDefault(); // preventDefault here might be aggressive for touchend if not needed
        }

        if (!this.drawing) {
            if (!this.start_pos && ["line", "ellipse", "rectangle", "triangle"].includes(this.mode_select.value)) {
                 this.preview_ctx.clearRect(0, 0, this.width, this.height);
            }
            return;
        }
        
        // ★★★ 座標取得をヘルパーメソッド経由に (e.offsetX/Yがない場合があるため)
        // stop_draw_handlerでは、最後の座標はe.touchesがない場合があるので、
        // start_pos や mousemove で記録された最後の座標を使うか、
        // イベントオブジェクトから慎重に取得する必要がある。
        // ここでは、start_pos があればそれと、最後のmousemove時の座標（current_x, current_y）を
        // draw_move_handler で確定させる設計になっているため、
        // e (stopイベント) からの座標は使わない方が安全な場合もある。
        // ただし、図形描画では最後のmouseup/touchend位置が重要。
        let final_coords;
        if (e.type.startsWith('touch') && e.changedTouches && e.changedTouches.length > 0) {
            const canvasRect = e.target.getBoundingClientRect();
            final_coords = {
                x: e.changedTouches[0].clientX - canvasRect.left,
                y: e.changedTouches[0].clientY - canvasRect.top
            };
        } else if (e.offsetX !== undefined && e.offsetY !== undefined) {
            final_coords = { x: e.offsetX, y: e.offsetY };
        } else if (this.start_pos) { // フォールバックとして、最後のmousemoveの座標があればそれを使う（要検討）
                                     // または、start_posから計算できない図形の場合はエラーにするなど
            console.warn("Could not determine final coordinates accurately from stop event. Using last known if available.");
            // このケースでは、図形描画が不正確になる可能性がある。
            // draw_move_handlerで最終座標をthis.last_known_pos のように保存しておき、ここで使うのがより堅牢。
            // 今回は簡単のため、eから取得を試みる。
            if (this.preview_ctx_last_x !== undefined) { // 仮の変数（実際にはmousemoveで保存）
                 final_coords = {x: this.preview_ctx_last_x, y: this.preview_ctx_last_y};
            } else {
                final_coords = this.start_pos; // 最悪のケース
            }
        } else {
            this.drawing = false; this.start_pos = null; // 座標が取れない場合は終了
            return;
        }


        const mode = this.mode_select.value;
        const color = this.color_input.value;
        const thickness = parseInt(this.thickness_input.value);
        const should_fill = this.fill_shape_checkbox.checked;
        
        if (this.active_layer_idx !== null && !this.layers[this.active_layer_idx].is_background) {
            const ctx = this.layers[this.active_layer_idx].ctx;
            ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = thickness;
            ctx.globalCompositeOperation = "source-over"; 

            if (mode === "pen" || mode === "eraser") {
                ctx.closePath(); 
            } else if (["line", "ellipse", "rectangle", "triangle"].includes(mode) && this.start_pos) {
                this.preview_ctx.clearRect(0, 0, this.width, this.height);
                const final_x = final_coords.x; 
                const final_y = final_coords.y;
                ctx.beginPath();

                if (mode === "line") {
                    ctx.moveTo(this.start_pos.x, this.start_pos.y); ctx.lineTo(final_x, final_y); ctx.stroke();
                } else if (mode === "ellipse") {
                    const cx_ = (this.start_pos.x + final_x) / 2; const cy_ = (this.start_pos.y + final_y) / 2;
                    const rx_ = Math.abs(final_x - this.start_pos.x) / 2; const ry_ = Math.abs(final_y - this.start_pos.y) / 2;
                    if (rx_ > 0 && ry_ > 0) ctx.ellipse(cx_, cy_, rx_, ry_, 0, 0, 2 * Math.PI);
                    if (should_fill) ctx.fill(); else ctx.stroke();
                } else if (mode === "rectangle") {
                    const rx_ = Math.min(this.start_pos.x, final_x); const ry_ = Math.min(this.start_pos.y, final_y);
                    const rw_ = Math.abs(final_x - this.start_pos.x); const rh_ = Math.abs(final_y - this.start_pos.y);
                    if (rw_ > 0 && rh_ > 0) {
                        if (should_fill) ctx.fillRect(rx_, ry_, rw_, rh_);
                        else ctx.strokeRect(rx_, ry_, rw_, rh_);
                    }
                } else if (mode === "triangle") {
                    if (this.triangle_points.length === 1) {
                        const v1 = this.triangle_points[0]; const v2 = { x: final_x, y: final_y };
                        // 三角形の3点目をstart_pos.x, final_y としているのは元のロジックを踏襲
                        const v3 = { x: this.start_pos.x, y: final_y }; 
                        ctx.moveTo(v1.x, v1.y); ctx.lineTo(v2.x, v2.y); ctx.lineTo(v3.x, v3.y); ctx.closePath();
                        if (should_fill) ctx.fill(); else ctx.stroke();
                    }
                    this.triangle_points = [];
                }
            }
        }
        
        this.drawing = false; this.start_pos = null;
    }
  
    clear_all(e = null) {
        if (confirm("全レイヤーをクリアしますか？")) {
            this.layers.forEach(layer_obj => layer_obj.clear());
            this.update_container_background(); 
            this.undo_stack = []; this.redo_stack = []; this._update_history_buttons_state();
        }
    }

    save_image(e = null) {
        const temp_canvas = document.createElement("canvas");
        temp_canvas.width = this.width; temp_canvas.height = this.height;
        const temp_ctx = temp_canvas.getContext("2d");
        
        const save_format = this.save_format_select.value;
        let file_extension = save_format;
        let mime_type = `image/${save_format}`;
        let quality = null;

        if (save_format === "jpeg") { file_extension = "jpg"; mime_type = "image/jpeg"; }
        if (save_format === "jpeg" || save_format === "webp") {
            quality = parseFloat(this.quality_slider.value);
        }

        const bg_layer = this.layers[0];
        if (bg_layer.visible) {
            temp_ctx.drawImage(bg_layer.canvas, 0, 0);
        }

        for (let i = 1; i < this.layers.length; i++) {
            if (this.layers[i].visible) {
                temp_ctx.drawImage(this.layers[i].canvas, 0, 0);
            }
        }
        
        const image_data_url = (quality !== null && (mime_type === "image/jpeg" || mime_type === "image/webp"))
            ? temp_canvas.toDataURL(mime_type, quality)
            : temp_canvas.toDataURL(mime_type);
            
        const dl_link = document.createElement("a");
        dl_link.href = image_data_url;
        dl_link.download = `ArtProject.${file_extension}`;
        document.body.appendChild(dl_link);
        dl_link.click();
        document.body.removeChild(dl_link);
    }

    change_bg_color(e = null) {
        const new_color = this.bg_color_picker.value;
        if (this.layers[0]) {
            this.layers[0].set_bg_color(new_color);
        }
    }

    clear_background_image(e = null) {
        if (this.layers[0] && this.layers[0].is_background) {
            this.layers[0].bg_image = null;
            this.layers[0].draw_bg(); 
            this.bg_upload_input.value = ""; 
        }
    }

    handle_bg_upload(e) {
        const files = e.target.files;
        if (files.length === 0) return;
        const file_item = files[0];
        const load_option_radio = document.querySelector('input[name="bg-load-option"]:checked');
        const load_option = load_option_radio ? load_option_radio.value : "fit_to_canvas";

        const reader = new FileReader();
        reader.onload = (event_r) => {
            const data_url = event_r.target.result;
            const img_el = new Image();
            img_el.onload = (event_i) => {
                if (load_option === "resize_canvas_to_image") {
                    const w = img_el.naturalWidth;
                    const h = img_el.naturalHeight;
                    if (confirm(`キャンバスを画像(${w}x${h})に合わせますか?(描画クリア)`)) {
                        this.resize_all_canvases(w, h);
                        this.layers[0].set_bg_image(img_el);
                    } else {
                        this.bg_upload_input.value = ""; 
                        return;
                    }
                } else { 
                    this.layers[0].set_bg_image(img_el);
                }
                this.layers[0].visible = true; this.layers[0].vis_toggle.checked = true;
                this.layers[0].canvas.style.display = "block";
                this.update_container_background();
            };
            img_el.src = data_url;
        };
        reader.readAsDataURL(file_item);
    }

    change_bg_opacity(e = null) {
        const val = parseFloat(this.bg_opacity_slider.value);
        if (this.layers[0]) {
            this.layers[0].bg_opacity = val;
            this.layers[0].draw_bg(); 
        }
        this.bg_opacity_value_span.textContent = val.toFixed(2);
    }
      
    delete_layer(idx_to_delete) {
        if (!(idx_to_delete >= 0 && idx_to_delete < this.layers.length) || this.layers[idx_to_delete].is_background) return;
        if (!confirm(`「${this.layers[idx_to_delete].name}」を削除しますか？`)) return;

        const active_layer_before_delete = (this.active_layer_idx !== null && this.active_layer_idx < this.layers.length) ? this.layers[this.active_layer_idx] : null;
        
        const removed_layer = this.layers.splice(idx_to_delete, 1)[0];
        if (removed_layer && removed_layer.canvas) {
            removed_layer.canvas.remove(); 
        }
        
        this._refresh_layer_ui_and_indices(); 

        let new_active_idx_candidate = null;
        if (active_layer_before_delete === removed_layer || this.active_layer_idx === null || this.active_layer_idx >= this.layers.length || (this.active_layer_idx !== null && this.active_layer_idx > idx_to_delete)) {
            if (idx_to_delete < this.layers.length && !this.layers[idx_to_delete].is_background) {
                new_active_idx_candidate = idx_to_delete; 
            } else if (idx_to_delete - 1 >= 1 && !this.layers[idx_to_delete - 1].is_background) { 
                new_active_idx_candidate = idx_to_delete - 1; 
            } else { 
                for (let i = this.layers.length - 1; i >= 1; i--) { 
                    if (!this.layers[i].is_background) {
                        new_active_idx_candidate = i; break;
                    }
                }
            }
        } else if (active_layer_before_delete) {
             const new_idx_of_old_active = this.layers.indexOf(active_layer_before_delete);
             if (new_idx_of_old_active !== -1) new_active_idx_candidate = new_idx_of_old_active;
        }
        
        this.set_active_layer(new_active_idx_candidate);
        this.undo_stack = []; this.redo_stack = []; this._update_history_buttons_state();
    }

    swap_layers(idx1, idx2) {
        if (!(idx1 >= 0 && idx1 < this.layers.length && idx2 >= 0 && idx2 < this.layers.length)) return;
        if (idx1 === idx2 || this.layers[idx1].is_background || this.layers[idx2].is_background) return;

        const active_layer_before_swap = (this.active_layer_idx !== null && this.active_layer_idx < this.layers.length) ? this.layers[this.active_layer_idx] : null;

        [this.layers[idx1], this.layers[idx2]] = [this.layers[idx2], this.layers[idx1]]; 
        
        this._refresh_layer_ui_and_indices(); 

        if (active_layer_before_swap) {
            const new_idx_of_old_active = this.layers.indexOf(active_layer_before_swap);
            if (new_idx_of_old_active !== -1) this.set_active_layer(new_idx_of_old_active);
            else this.set_active_layer(null); 
        } else {
            this.set_active_layer(null);
        }
        this.undo_stack = []; this.redo_stack = []; this._update_history_buttons_state();
    }

    move_layer_up(idx) { 
        if (this.layers[idx].is_background || idx >= this.layers.length - 1) return;
        this.swap_layers(idx, idx + 1);
    }

    move_layer_down(idx) { 
        if (this.layers[idx].is_background || idx <= 1) return; 
        this.swap_layers(idx, idx - 1);
    }
}
  
document.addEventListener('DOMContentLoaded', () => {
    const app = new PaintApp();
});