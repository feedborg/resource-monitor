/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

// system-monitor: Gnome shell extension displaying system informations in gnome shell status bar, such as memory usage, cpu usage, network rates…
// Copyright (C) 2011 Florian Mounier aka paradoxxxzero
// Copyright (C) 2011 Aleksey Yatsiuk e-mail@feedb.org

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

// Author: Florian Mounier aka paradoxxxzero
//          Aleksey Yatsiuk e-mail@feedb.org

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const St = imports.gi.St;

const Main = imports.ui.main;
const Panel = imports.ui.panel;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

function SystemMonitor() {
    this._init.apply(this, arguments);
}

function bytes_to_string (speed) {
  
  var pristavka = "";

  if (speed < 1024) {
  	pristavka = "KiB/s"
  } else if (speed >= 1024) {
  	speed = speed / 1024;
  	pristavka = "MiB/s"
  }
  return (speed.toFixed(1) + pristavka);
}

SystemMonitor.prototype = {
    __proto__: PanelMenu.SystemStatusButton.prototype,
    icon_size: Math.round(Panel.PANEL_ICON_SIZE * 4 / 5),

    _init_menu: function() {
        let section = new PopupMenu.PopupMenuSection("Usages");
        this.menu.addMenuItem(section);

        item = new PopupMenu.PopupMenuItem("CPU");
        item.addActor(new St.Label({ text:':', style_class: "sm-label"}));
        this._cpu = new St.Label({ style_class: "sm-value"});
        item.addActor(new St.Label({ style_class: "sm-void"}));
        item.addActor(new St.Label({ style_class: "sm-void"}));
        item.addActor(this._cpu);
        item.addActor(new St.Label({ text:'%', style_class: "sm-label"}));
        section.addMenuItem(item);

        let item = new PopupMenu.PopupMenuItem("Memory");
        this._mem = new St.Label({ style_class: "sm-value"});
        this._mem_total = new St.Label({ style_class: "sm-value"});
        item.addActor(new St.Label({ text:':', style_class: "sm-label"}));
        item.addActor(this._mem);
        item.addActor(new St.Label({ text: "/", style_class: "sm-label"}));
        item.addActor(this._mem_total);
        item.addActor(new St.Label({ text: "M", style_class: "sm-label"}));
        
        section.addMenuItem(item);

        item = new PopupMenu.PopupMenuItem("Swap");
        this._swap = new St.Label({ style_class: "sm-value"});
        this._swap_total = new St.Label({ style_class: "sm-value"});
        item.addActor(new St.Label({ text:':', style_class: "sm-label"}));
        item.addActor(this._swap);
        item.addActor(new St.Label({ text: "/", style_class: "sm-label"}));
        item.addActor(this._swap_total);
        item.addActor(new St.Label({ text: "M", style_class: "sm-label"}));
        section.addMenuItem(item);

        item = new PopupMenu.PopupMenuItem("Net");
        item.addActor(new St.Label({ text:':', style_class: "sm-label"}));
        this._netdown = new St.Label({ style_class: "sm-value"});
        item.addActor(this._netdown);
        item.addActor(new St.Icon({ icon_type: St.IconType.SYMBOLIC, icon_size: 16, icon_name:'go-down'}));
        this._netup = new St.Label({ style_class: "sm-value"});
        item.addActor(this._netup);
        item.addActor(new St.Icon({ icon_type: St.IconType.SYMBOLIC, icon_size: 16, icon_name:'go-up'}));
        section.addMenuItem(item);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        section = new PopupMenu.PopupMenuSection("Toggling");
        this.menu.addMenuItem(section);
	    this._cpu_widget = new PopupMenu.PopupSwitchMenuItem("Display cpu", true);
	    this._cpu_widget.connect('toggled', Lang.bind(this, function(item) {
	                                                      this._cpu_box.visible = item.state;
	                                                      if(this._schema) {
		                                                      this._schema.set_boolean("cpu-display", item.state);
	                                                      }
                                                      }));
        section.addMenuItem(this._cpu_widget);
	    this._mem_widget = new PopupMenu.PopupSwitchMenuItem("Display memory", true);
	    this._mem_widget.connect('toggled', Lang.bind(this, function(item) {
	                                                      this._mem_box.visible = item.state;
	                                                      if(this._schema) {
		                                                      this._schema.set_boolean("memory-display", item.state);
	                                                      }
                                                      }));
        section.addMenuItem(this._mem_widget);
	    this._swap_widget = new PopupMenu.PopupSwitchMenuItem("Display swap", true);
	    this._swap_widget.connect('toggled', Lang.bind(this, function(item) {
	                                                       this._swap_box.visible = item.state;
	                                                       if(this._schema) {
		                                                       this._schema.set_boolean("swap-display", item.state);
	                                                       }
                                                       }));
        section.addMenuItem(this._swap_widget);
	    this._net_widget = new PopupMenu.PopupSwitchMenuItem("Display net", true);
	    this._net_widget.connect('toggled', Lang.bind(this, function(item) {
	                                                      this._net_box.visible = item.state;
	                                                      if(this._schema) {
		                                                      this._schema.set_boolean("net-display", item.state);
	                                                      }
                                                      }));
        section.addMenuItem(this._net_widget);
    },
    _init_status: function() {
        let box = new St.BoxLayout();
        this._mem_ = new St.Label({ style_class: "sm-status-value"});
        this._swap_ = new St.Label({ style_class: "sm-status-value"});
        this._cpu_ = new St.Label({ style_class: "sm-status-value"});
        this._netdown_ = new St.Label({ style_class: "sm-big-status-value"});
        this._netup_ = new St.Label({ style_class: "sm-big-status-value"});

        let cpu_icon = new St.Icon({ icon_type: St.IconType.FULLCOLOR, icon_size: this.icon_size, icon_name:'cpu-icon'});
        let mem_icon = new St.Icon({ icon_type: St.IconType.FULLCOLOR, icon_size: this.icon_size, icon_name:'mem-icon'});
        let swap_icon = new St.Icon({ icon_type: St.IconType.FULLCOLOR, icon_size: this.icon_size, icon_name:'swap-icon'});
        let net_icon = new St.Icon({ icon_type: St.IconType.FULLCOLOR, icon_size: this.icon_size, icon_name:'net-icon'});


	    this._cpu_box = new St.BoxLayout();
        this._cpu_box.add_actor(cpu_icon);
        this._cpu_box.add_actor(this._cpu_);
        this._cpu_box.add_actor(new St.Label({ text: '%', style_class: "sm-perc-label"}));
	    box.add_actor(this._cpu_box);

	    this._mem_box = new St.BoxLayout();
        this._mem_box.add_actor(mem_icon);
        this._mem_box.add_actor(this._mem_);
        this._mem_box.add_actor(new St.Label({ text: '%', style_class: "sm-perc-label"}));
	    box.add_actor(this._mem_box);

	    this._swap_box = new St.BoxLayout();
        this._swap_box.add_actor(swap_icon);
        this._swap_box.add_actor(this._swap_);
        this._swap_box.add_actor(new St.Label({ text: '%', style_class: "sm-perc-label"}));
	    box.add_actor(this._swap_box);

	    this._net_box = new St.BoxLayout();
        this._net_box.add_actor(net_icon);
        this._net_box.add_actor(new St.Icon({ icon_type: St.IconType.SYMBOLIC, icon_size: 2 * this.icon_size / 3, icon_name:'go-down'}));
        this._net_box.add_actor(this._netdown_);
        this._net_box.add_actor(new St.Icon({ icon_type: St.IconType.SYMBOLIC, icon_size: 2 * this.icon_size / 3, icon_name:'go-up'}));
        this._net_box.add_actor(this._netup_);
	    box.add_actor(this._net_box);

        this.actor.set_child(box);
    },
    _init: function() {
	    Panel.__system_monitor = this;
        PanelMenu.SystemStatusButton.prototype._init.call(this, 'utilities-system-monitor', 'System monitor');

	    this.__last_cpu_time = 0;
	    this.__last_cpu_idle = 0;
	    this.__last_cpu_total = 0;
	    this.__last_net_time = 0;
	    this.__last_net_down = 0;
	    this.__last_net_up = 0;

        this._init_status();
	    this._schema = false;
        this._init_menu();

	    this._schema = new Gio.Settings({ schema: 'org.gnome.shell.extensions.system-monitor' });
	    this._mem_box.visible = this._schema.get_boolean("memory-display");
	    this._mem_widget.setToggleState(this._mem_box.visible);
	    this._swap_box.visible = this._schema.get_boolean("swap-display");
	    this._swap_widget.setToggleState(this._swap_box.visible);
	    this._cpu_box.visible = this._schema.get_boolean("cpu-display");
	    this._cpu_widget.setToggleState(this._cpu_box.visible);
	    this._net_box.visible = this._schema.get_boolean("net-display");
	    this._net_widget.setToggleState(this._net_box.visible);

	    this._schema.connect('changed::memory-display',
                             Lang.bind(this,
                                       function () {
		                                   this._mem_box.visible = this._schema.get_boolean("memory-display");
		                                   this._mem_widget.setToggleState(this._mem_box.visible);
	                                   }));
	    this._schema.connect('changed::swap-display',
                             Lang.bind(this,
                                       function () {
		                                   this._swap_box.visible = this._schema.get_boolean("swap-display");
		                                   this._swap_widget.setToggleState(this._swap_box.visible);
	                                   }));
	    this._schema.connect('changed::cpu-display',
                             Lang.bind(this,
                                       function () {
		                                   this._cpu_box.visible = this._schema.get_boolean("cpu-display");
		                                   this._cpu_widget.setToggleState(this._cpu_box.visible);
	                                   }));

	    this._schema.connect('changed::net-display',
                             Lang.bind(this,
                                       function () {
		                                   this._net_box.visible = this._schema.get_boolean("net-display");
		                                   this._net_widget.setToggleState(this._net_box.visible);
	                                   }));

        if(this._schema.get_boolean("center-display")) {
	        Main.panel._centerBox.add(this.actor);
        }

	    this._update_mem_swap();
	    this._update_cpu();
	    this._update_net();

        GLib.timeout_add(0, 10000,
                         Lang.bind(this, function () {
                                       this._update_mem_swap();
                                       return true;
                                   }));
        GLib.timeout_add(0, 1500,
                         Lang.bind(this, function () {
                                       this._update_cpu();
                                       return true;
                                   }));
        GLib.timeout_add(0, 1000,
                         Lang.bind(this, function () {
                                       this._update_net();
                                       return true;
                                   }));
    },

    _update_mem_swap: function() {
        let meminfo = GLib.file_get_contents('/proc/meminfo');
        if(meminfo[0]) {
            let meminfo_lines = meminfo[1].split("\n");
            let memtotal = 0, memfree = 0, membuffers = 0, memcached = 0, swaptotal = 0, swapfree = 0;
            // Lines are not always at the same positions
            for(var i = 0 ; i < meminfo_lines.length ; i++) {
                let line = meminfo_lines[i].replace(/ +/g, " ").split(" ");
                switch(line[0]) {
                case "MemTotal:":
                    memtotal = Math.round(line[1] / 1024);
                    break;
                case "MemFree:":
                    memfree = Math.round(line[1] / 1024);
                    break;
                case "Buffers:":
                    membuffers = Math.round(line[1] / 1024);
                    break;
                case "Cached:":
                    memcached = Math.round(line[1] / 1024);
                    break;
                case "SwapTotal:":
                    swaptotal = Math.round(line[1] / 1024);
                    break;
                case "SwapFree:":
                    swapfree = Math.round(line[1] / 1024);
                    break;
                }
            }

            if(memtotal == 0) {
                global.log("Error reading memory in /proc/meminfo");
                return;
            }

            let mem_used = memtotal - memfree - membuffers - memcached;
            let mem_percentage = Math.round(100 * mem_used / memtotal);
            this._mem_.set_text(mem_percentage.toString());
            this._mem.set_text(mem_used.toString());
            this._mem_total.set_text(memtotal.toString());

            if(swaptotal == 0) {
                global.log("Error reading memory in /proc/meminfo");
                return;
            }
            let swap_used = swaptotal - swapfree;
            let swap_percentage = Math.round(100 * swap_used / swaptotal);
            this._swap_.set_text(swap_percentage.toString());
            this._swap.set_text(swap_used.toString());
            this._swap_total.set_text(swaptotal.toString());

        } else {
	        global.log("system-monitor: reading /proc/meminfo gave an error");
	    }
    },

    _update_cpu: function() {
        let stat = GLib.file_get_contents('/proc/stat');
        if(stat[0]) {
            let stat_lines = stat[1].split("\n");
	        let cpu_params = stat_lines[1].replace(/ +/g, " ").split(" ");
	        let idle = parseInt(cpu_params[4]);
	        let total = parseInt(cpu_params[1]) + parseInt(cpu_params[2]) + parseInt(cpu_params[3]) + parseInt(cpu_params[4]);
	        let time = GLib.get_monotonic_time() / 1000;
	        if(this.__last_cpu_time != 0) {
		        let delta = time - this.__last_cpu_time;
		        let cpu_usage = (100 - Math.round(100 * (idle - this.__last_cpu_idle) / (total - this.__last_cpu_total)));
		        this._cpu_.set_text(cpu_usage.toString());
		        this._cpu.set_text(cpu_usage.toString());
	        }
	        this.__last_cpu_idle = idle;
	        this.__last_cpu_total = total;
	        this.__last_cpu_time = time;
        } else {
	        global.log("system-monitor: reading /proc/stat gave an error");
	    }
    },

    _update_net: function() {
        let net = GLib.file_get_contents('/proc/net/dev');
        if(net[0]) {
            let net_lines = net[1].split("\n");
            let down = 0, up = 0;
            for(var i = 3; i < net_lines.length - 1 ; i++) {
	            let net_params = net_lines[i].replace(/ +/g, " ").split(" ");
	            down += parseInt(net_params[2]);
	            up += parseInt(net_params[10]);
            }
	        let time = GLib.get_monotonic_time() / 1000;
	        if(this.__last_net_time != 0) {
		        let delta = time - this.__last_net_time;
		        let net_down = (down - this.__last_net_down) / delta;
		        let net_up = (up - this.__last_net_up) / delta;

        
		        this._netdown_.set_text(bytes_to_string(net_down));
		        this._netup_.set_text(bytes_to_string(net_up));
		        this._netdown.set_text(bytes_to_string(net_down));
		        this._netup.set_text(bytes_to_string(net_up));
	        }
	        this.__last_net_down = down;
	        this.__last_net_up = up;
	        this.__last_net_time = time;
        } else {
	        global.log("system-monitor: reading /proc/net/dev gave an error");
	    }
    },

    _onDestroy: function() {}
};


function main() {
    Panel.STANDARD_TRAY_ICON_ORDER.unshift('system-monitor');
    Panel.STANDARD_TRAY_ICON_SHELL_IMPLEMENTATION['system-monitor'] = SystemMonitor;
}
