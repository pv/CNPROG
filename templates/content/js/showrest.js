/*
 * showrest.js -- JavaScript implementation of a subset of ReStructuredText.
 *
 * The fundamental imperative is: input accepted by Showrest must
 * be *some* subset of valid Rst.
 */

/*
 * Copyright (C) 2009 Pauli Virtanen
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 * 
 * - Redistributions of source code must retain the above copyright
 *   notice, this list of conditions and the following disclaimer.
 * 
 * - Redistributions in binary form must reproduce the above
 *   copyright notice, this list of conditions and the following
 *   disclaimer in the documentation and/or other materials provided
 *   with the distribution.
 * 
 * - Neither the name of the copyright holder nor the names of any
 *   contributors may be used to endorse or promote products derived
 *   from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */ 

/*
 * Showrest usage::
 *
 *     var text = "RST *rocks*.";
 *     var converter = new showrest.converter();
 *     var html = converter.makeHtml(text);
 *     alert(html);
 */

var showrest = function() {};

var debugTables = [];
function debug(obj) {
    var text = $("#debug").text() + "\n********\n";
    var step = 2;

    gen_indent = function(n) {
        var x = "";
        for (i = 0; i < n; ++i) {
            x += " ";
        }
        return x;
    }

    walk = function(o, n) {
        var t = "";
        if (o == null) {
            t = "null";
        } else if (o['join']) {
            var its = [];
            var ind = gen_indent(n);
            var ind2 = gen_indent(n+step);
            var acc_len = ind.length;
            var was_list = false;
            t = "[";
            for (i in o) {
                s = walk(o[i], n+step);
                acc_len += s.length;
                if (s[0] == '[' || s[0] == '{') {
                    t += "\n" + ind2 + s;
                    was_list = true;
                } else if (was_list) {
                    t += "\n" + ind2 + s;
                    was_list = false;
                } else {
                    t += s;
                }
                t += ", ";
            }
            t = t.replace(/, $/, '');
            t += "]";
        } else if (o['charAt']) {
            t = "\"" + o.replace("\"", "\\\"") + "\"";
        } else if (o['toString']) {
            t = o.toString();
        } else {
            t = String(o);
        }
        return t;
    }

    $("#debug").text(text + walk(obj, 0));
}

/*
 * Converter
 */
showrest.converter = function() {

    /*
     * Dedent and strip text lines to [(indent_size, text), ...]
     */
    this.dedent = function(text) {
	var lines = text.split("\n");
	var out = [];
	var indent_re = /^\s*/m;
	for (i in lines) {
            line = lines[i];
	    if (indent_re.test(line)) {
                var indent = line.length - RegExp.rightContext.length;
                var text = RegExp.rightContext;
                /\s*$/.test(text);
 		out.push([indent, RegExp.leftContext]);
	    }
	}
 	return out;
    }

    /*
     * Tree-tokenize RST input to
     *
     *     [token_id, token_args, token_children]
     *
     * on a line-based block level.
     */
    this.tokenize = function(lines) {
        var top = ['top', null, []];
        var stack = [top];
        var indent_stack = [0];
        var directive_init = false;
        var i;

        lines = this.dedent(lines);

        get_indent = function(n) {
            var t = "";
            var i;
            for (i = 0; i < n; ++i) {
                t += " ";
            }
            return t;
        }

        slurp_indented = function(min_indent) {
            var items = [];
            var first = true;
            ++i;
            while (i < lines.length 
                   && (lines[i][0] > min_indent || !lines[i][1])) {
                if (lines[i][1] && first) {
                    min_indent = lines[i][0];
                }
                items.push(get_indent(lines[i][0] - min_indent) + lines[i][1]);
                ++i;
            }
            --i;
            return items;
        };

        preceding_item = function() {
            if (!stack[0][2] || stack[0][2].length == 0) {
                return [null, null, null];
            } else {
                return stack[0][2][stack[0][2].length-1];
            }
        }

        i = -1;
        while (++i < lines.length) {
            var indent = lines[i][0];
            var text = lines[i][1];
            var next_text;
            var last_empty;
            var m;

            if (i+1 < lines.length) {
                next_text = lines[i+1][1];
            } else {
                next_text = null;
            }

            if (i-1 > 0) {
                last_empty = !lines[i-1][1];
            } else {
                last_empty = true;
            }

            /* 
             * Handle indent 
             */
            if (!text) {
                /* Empty line: no meaningful indent */
                directive_init = false;
                continue;
            } else if (indent > indent_stack[0]) {
                var item = preceding_item();
                if (item[0] == 'directive' || item[0] == 'foot' 
                        || item[0] == 'list') {
                    /* Indent to directive, footnote, or list item */
                    stack.unshift(item);
                    indent_stack.unshift(indent);
                    directive_init = (item[0] == 'directive');
                } else {
                    /* Indented block, apparently */
                    var token = ['block', null, []];
                    stack[0][2].push(token);
                    stack.unshift(token);
                    indent_stack.unshift(indent);
                }
            } else if (indent < indent_stack[0]) {
                /* FIXME: recognize unexpected dedents */

                while (indent_stack[0] > indent) {
                    stack.shift();
                    indent_stack.shift()
                }
            }

            /*
             * Handle blocks
             */


            /* Directive */
            m = text.match(/^\.\.\s+([a-z0-9-]+)::(.*)$/);
            if (m) {
                var token = ['directive', [m[1], m[2]], []];
                stack[0][2].push(token);
                continue
            }

            /* Directive option or field */
            m = text.match(/^:([a-z0-9-]+):([^:].*)?$/);
            if (m) {
                var token = [directive_init ? 'directive-option' : 'field',
                             [m[1], m[2]], null];
                token[1] = token[1].concat(slurp_indented(indent));
                stack[0][2].push(token);
                continue
            }

            directive_init = false;

            /* Footnote or bibliography reference */
            m = text.match(/^\.\.\s+\[(.+)\](\s.*)?/);
            if (m) {
                var token = ['foot', [m[1]], []];
                if (/^\s/.test(m[2])) {
                    token[2].push(['inline', [RegExp.rightContext], null]);
                }
                stack[0][2].push(token);
                continue;
            }

            /* Link target */
            m = text.match(/^\.\.\s+_([a-zA-Z0-9.-]+):\s+(.*)$/);
            if (m) {
                var token = ['target', [m[1]], null];
                if (m[2]) {
                    token[1] = token[1].concat(m[2]);
                }
                token[1] = token[1].concat(slurp_indented(indent));
                stack[0][2].push(token);
                continue;
            }

            /* Comment */
            m = text.match(/^\.\.\s+/);
            if (m) {
                slurp_indented(indent);
                continue;
            }

            /* Line block */
            m = text.match(/^\|(.*)?$/);
            if (m) {
                if (/^\s/.test(m[1])) {
                    var item = preceding_item();
                    if (item[0] == 'line') {
                        item[1].push(RegExp.rightContext);
                    } else {
                        var token = ['line', [RegExp.rightContext], null];
                        stack[0][2].push(token);
                    }
                } else {
                    stack[0][2].push(['error', 
                                      ["Invalid substitution reference"], 
                                      null]);
                }
                continue
            }

            /* Preformatted, maybe (note the next-line look-ahead check) */
            m = text.match(/^(.*)::\s*$/);
            if (m && next_text == "") {
                if (m[1]) {
                    var token = ['inline', [m[1] + ":"], null];
                    stack[0][2].push(token);
                }
                ++i;
                token = ['pre', slurp_indented(indent).join("\n"), null];
                stack[0][2].push(token);
                continue;
            }

            /* Section markup (look-ahead) */
            if (/^-{3,}$/.test(next_text) || /^={3,}$/.test(next_text) 
                || /^\+{3,}$/.test(next_text) || /^\^{3,}$/.test(next_text)
                || /^#{3,}$/.test(next_text) || /^\*{3,}$/.test(next_text)) {
                if (text.length > next_text.length) {
                    stack[0][2].push(['error', ['Title underline wrong'], 
                                      null]);
                }
                stack[0][2].push(['section', [text, next_text[0]], null]);
                ++i;
                continue;
            }

            /* List items */
            m = text.match(/^(-|#|[a-z0-9]+\.|[a-z0-9]+\)|\([a-z0-9]+\))(\s+)(.*)/);
            if (m && (last_empty || preceding_item()[0] != 'inline')) {
                /* FIXME: validate the list marker, eg., for roman numerals */
                stack[0][2].push(['list', [m[1]], []]);

                /* Now, do an evil thing: re-process modified line, so that
                   indentation is processed appropriately */
                lines[i][1] = m[3];
                lines[i][0] = indent + m[1].length + m[2].length;
                --i;
                continue;
            }

            /* Something else: inline material */
            var item = preceding_item();
            if (item[0] == 'inline') {
                item[1][0] += " ";
                item[1][0] += text;
            } else {
                stack[0][2].push(['inline', [text], null]);
            }
            continue;
        }

	return top[2];
    }

    /*
     * Inline markup tokenizer
     */
    this.tokenizeInline = function(text) {
        
    }
    

    this.makeHtml = function(text) {
        tokens = this.tokenize(text);
        debug(tokens);
        debug(this.dedent(text));

	/* Handle escapes */
	text = text.replace(/\\\*/g, '&#42;');
	text = text.replace(/\\\>/g, '&gt;');
	text = text.replace(/\\\</g, '&lt;');
	text = text.replace(/\\\`/g, '&#96;');
	text = text.replace(/\\(.)/g, '$1');

	/* Mogrify simple markup */
	text = text.replace(/\*\*([^\s][^\*]+)\*\*/g, '<b>$1</b>');
	text = text.replace(/\*([^\s][^\*]+)\*/g, '<em>$1</em>');
	text = text.replace(/\n[ \t\v\f]*\n/g, '</p><p>');

	return "<p>" + text + "</p>";
    }
}
