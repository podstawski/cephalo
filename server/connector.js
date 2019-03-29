'use strict';

const {format} = require('util');
const {SqlConnector} = require('loopback-connector');
const {ParameterizedSQL} = SqlConnector;
const {MySQL, initialize} = require('loopback-connector-mysql');

const {sprintf} = require('sprintf-js');
const {LoopbackError} = require('../common/utils');




class Connector extends MySQL {


  constructor(settings) {
    //console.log('constructor', settings);
    super(settings);
  }


  connect(callback) {
    if (this.settings.lazyConnect)
      setTimeout(super.connect.bind(this), 0, callback);
    else
      return super.connect(callback);
  };


  execute(sql, params, options, callback) {
    // console.log('execute', sql);
    return super.execute(sql, params, options, callback);
  }

  executeSQL(sql, params, options, callback) {
    // console.log('executeSQL', sql);
    return super.executeSQL(sql, params, options, callback);
  }

  buildColumnNames(model, filter) {
    // console.log('buildColumnNames', model, filter);

    let table = this.tableEscaped(model);
    let names = super.buildColumnNames(model, filter);
    if (names === '*')
      return table + '.*';

    return names.split(',').map(k => table + '.' + k).join(',');
  }

  buildSelect(model, filter, options) {
    // console.log('buildSelect', model, filter, options);

    let idNames = this.idNames(model);

    if (!filter.order) {
      if (idNames && idNames.length) {
        filter.order = idNames;
      }
    }


    let columns = filter.fields ? this.buildColumnNames(model, filter) : this.tableEscaped(model) + '.*';
    let select = new ParameterizedSQL('SELECT ' + columns + ' FROM ' + this.tableEscaped(model));

    if (filter) {
      let where = this.buildWhere(model, filter.where);
      let order = this.buildOrderBy(model, filter.order, where);
      let joins = this.buildLeftJoins(model, where);

      select.merge(joins);
      select.merge(where);

      if (where.joins && Object.keys(where.joins).length > 0)
        select.merge(this.buildGroupBy(model, idNames));

      select.merge(order);

      if (filter.limit || filter.skip || filter.offset) {
        select = this.applyPagination(model, select, filter);
      }
    }

    let stmt = this.parameterize(select);
    return stmt;
  }

  buildLeftJoins(model, where) {
    let joins = new ParameterizedSQL('');

    if (!where.joins || Object.keys(where.joins).length === 0)
      return joins;

    for (let k in where.joins)
      joins.merge(new ParameterizedSQL(format('LEFT JOIN %s ON %s.%s = %s.%s', this.tableEscaped(k), where.joins[k][0], where.joins[k][1], where.joins[k][2], where.joins[k][3])));

    return joins;
  }

  buildWhere(model, where) {
    //console.log('buildWhere', model, where);

    return super.buildWhere(model, where);
  }

  _buildWhere(model, where) {
    //console.log('_buildWhere', model, where);
    //return super._buildWhere(model, where);

    if (!where) {
      return new ParameterizedSQL('');
    }

    if (typeof where !== 'object' || Array.isArray(where)) {
      return new ParameterizedSQL('');
    }

    let self = this;
    let columnValue, sqlExp;
    let whereStmts = [];
    let allJoins = {};
    let parsed;

    const columnComparisionRegEx = /^\$[^'"\$]+\$$/;


    for (let key in where) {
      let oKey = key;
      if (key.match(columnComparisionRegEx)) {
        key = key.substr(1, key.length - 2);
      }

      let stmt = new ParameterizedSQL('', []);
      // Handle and/or operators
      if (key === 'and' || key === 'or') {
        let branches = [];
        let branchParams = [];
        let clauses = where[oKey];
        if (Array.isArray(clauses)) {

          for (let i = 0, n = clauses.length; i < n; i++) {
            let stmtForClause = self._buildWhere(model, clauses[i]);
            if (stmtForClause.sql) {
              stmtForClause.sql = '(' + stmtForClause.sql + ')';
              branchParams = branchParams.concat(stmtForClause.params);
              branches.push(stmtForClause.sql);
            }
            if (stmtForClause.joins)
              for (let k in stmtForClause.joins)
                if (!allJoins[k])
                  allJoins[k] = stmtForClause.joins[k];
          }
          stmt.merge({
            sql: '(' + branches.join(' ' + key.toUpperCase() + ' ') + ')',
            params: branchParams,
          });
          whereStmts.push(stmt);
          continue;
        }
        // The value is not an array, fall back to regular fields
      }


      parsed = self.parseColumnDeep(self.app, model, key);
      if (parsed == null)
        throw new LoopbackError(sprintf(`Unknown property '%s'`, key), 'UNKNOWN_PROPERTY');

      let {table, column, joins, props} = parsed;
      let columnName = self.escapeColumn(table, column);

      let p = props[column];

      if (!p)
        throw new LoopbackError(sprintf(`Unknown property '%s' for model '%s'`, column, table), 'UNKNOWN_PROPERTY');

      for (let k in joins)
        if (!allJoins[k])
          allJoins[k] = joins[k];

      let expression = where[oKey];


      if (expression === null || expression === undefined) {
        stmt.merge(columnName + ' IS NULL');
      } else if (expression && expression.constructor === Object) {
        let operator = Object.keys(expression)[0];
        // Get the expression without the operator
        expression = expression[operator];

        if (operator === 'inq' || operator === 'nin' || operator === 'between') {
          columnValue = [];
          if (Array.isArray(expression)) {
            // Column value is a list
            for (let j = 0, m = expression.length; j < m; j++) {
              columnValue.push(this.toColumnValue(p, expression[j]));
            }
          } else {
            columnValue.push(this.toColumnValue(p, expression));
          }
          if (operator === 'between') {
            // BETWEEN v1 AND v2
            let v1 = columnValue[0] === undefined ? null : columnValue[0];
            let v2 = columnValue[1] === undefined ? null : columnValue[1];
            columnValue = [v1, v2];
          } else {
            // IN (v1,v2,v3) or NOT IN (v1,v2,v3)
            if (columnValue.length === 0) {
              if (operator === 'inq') {
                columnValue = [null];
              } else {
                // nin () is true
                continue;
              }
            }
          }
        } else if (operator === 'regexp' && expression instanceof RegExp) {
          // do not coerce RegExp based on property definitions
          columnValue = expression;
        } else {
          columnValue = this.toColumnValue(p, expression);
        }

        if (typeof expression === 'string' && expression.match(columnComparisionRegEx))
          columnValue = expression;


        sqlExp = self.buildExpression(columnName, operator, columnValue, p);
        stmt.merge(sqlExp);
      } else {
        // The expression is the field value, not a condition
        columnValue = self.toColumnValue(p, expression);


        if (columnValue === null) {
          stmt.merge(columnName + ' IS NULL');
        } else {
          if (columnValue instanceof ParameterizedSQL) {
            stmt.merge(columnName + '=').merge(columnValue);
          } else {
            stmt.merge({
              sql: columnName + '=?',
              params: [columnValue],
            });
          }
        }
      }

      whereStmts.push(stmt);
    }


    let params = [];
    let sqls = [];

    for (let k = 0, s = whereStmts.length; k < s; k++) {
      sqls.push(whereStmts[k].sql);
      params = params.concat(whereStmts[k].params);
    }


    let questionMarkTable = [];
    for (let i = 0; i < sqls.length; i++) {
      let sqla = sqls[i].split('?');
      if (sqla.length === 1)
        continue;
      for (let j = 0; j < sqla.length - 1; j++)
        questionMarkTable.push({
          sqls: i,
          i: j,
          sqla: sqla
        });
    }


    for (let i = 0; i < params.length && questionMarkTable.length === params.length; i++) {
      if (typeof params[i] === 'string' && params[i].match(columnComparisionRegEx)) {
        let field = params[i].substr(1, params[i].length - 2);
        if (field.indexOf('.') > 0) {
          let {table, column, joins, props} = self.parseColumnDeep(self.app, model, field);
          field = self.escapeColumn(table, column);
          let p = props[column];
          if (p == null)
            field = null;
          else {
            for (let k in joins)
              if (!allJoins[k])
                allJoins[k] = joins[k];
          }
        } else {
          field = self.escapeColumn(model, field);
        }
        if (field) {
          let sql = questionMarkTable[i].sqla;

          sql[questionMarkTable[i].i] += field + sql[questionMarkTable[i].i + 1];
          sql.splice(questionMarkTable[i].i + 1, 1);
          sqls[questionMarkTable[i].sqls] = sql.join('?');

          params.splice(i, 1);
          questionMarkTable.splice(i, 1);
          i--;
        }
      }
    }




    let whereStmt = new ParameterizedSQL({
      sql: sqls.join(' AND '),
      params: params
    });

    whereStmt.joins = allJoins;
    return whereStmt;
  }

  buildExpressionBy(prefix, model, expression) {
    if (!expression) {
      return '';
    }

    if (typeof expression === 'string') {
      expression = [expression];
    }

    return prefix + ' BY ' + [].map.call(expression, key => {
      let p = key.split(/[\s,]+/);

      return p.length === 1 ? this.escapeColumn(model, key) : this.escapeColumn(model, p[0]) + ' ' + p[1];
    }, this).join(',');
  }

  buildOrderBy(model, order, where) {
    if (!order)
      return new ParameterizedSQL('');
    if (order.indexOf('.') === -1)
      return this.buildExpressionBy('ORDER', model, order);

    const allOrders = [];
    const orders = order.split(',');
    for (let i = 0; i < orders.length; i++) {
      if (orders[i].indexOf('.') === -1)
        allOrders.push(orders[i].trim());
      else {
        order = orders[i].trim().split(' ');
        let parsed = this.parseColumnDeep(this.app, model, order[0]);
        if (parsed) {
          order[0] = 'MIN(' + this.tableEscaped(parsed.table) + '.' + this.escapeName(parsed.column) + ')';

          if (!where.joins)
            where.joins = {};

          for (let k in parsed.joins)
            if (!where.joins[k])
              where.joins[k] = parsed.joins[k];
        }
        allOrders.push(order.join(' '));
      }
    }

    return new ParameterizedSQL('ORDER BY ' + allOrders.join(','));

  }

  buildGroupBy(model, group) {
    return this.buildExpressionBy('GROUP', model, group);
  }

  parseColumn(model, key) {
    return ~key.indexOf('.') !== 0 ? key.split('.', 2) : [model, key];
  }

  parseColumnDeep(app, model, key, depth) {
    if (!depth)
      depth = 0;

    if (key.indexOf('.') === -1)
      return {table: model, column: key, joins: {}, props: this.getModelDefinition(model).properties};
    const keys = key.split('.');
    if (keys[0] === model && keys.length == 2)
      return {table: model, column: keys[1], joins: {}, props: this.getModelDefinition(model).properties};


    const joins = {};
    const relations = app.models[model].relations;

    if (!relations[keys[0]])
      return null;

    const relation = relations[keys[0]];
    keys.splice(0, 1);
    key = keys.join('.');

    if (relation.modelThrough) {
      joins[relation.modelThrough.name] = [this.tableEscaped(relation.modelThrough.name), this.escapeName(relation.keyTo), this.tableEscaped(relation.modelFrom.name), this.escapeName(relation.keyFrom)];
      joins[relation.modelTo.name] = [this.escapeName(relation.modelTo.name), this.escapeName(relation.keyFrom), this.tableEscaped(relation.modelThrough.name), this.escapeName(relation.keyThrough)];
    } else {
      joins[relation.modelTo.name] = [this.tableEscaped(relation.modelTo.name), this.escapeName(relation.keyTo), this.tableEscaped(relation.modelFrom.name), this.escapeName(relation.keyFrom)];
    }

    const sub = this.parseColumnDeep(app, relation.modelTo.name, key, depth + 1);

    if (!sub)
      return null;

    for (let k in sub.joins)
      if (!joins[k])
        joins[k] = sub.joins[k];

    sub.joins = joins;

    return sub;

  }

  escapeColumn(model, key) {
    let [table, column] = this.parseColumn(model, key);

    return this.escapeName(table) + '.' + this.escapeName(column);
  }

  count(model, where, options, cb) {
    // console.log('count', model, where);

    if (typeof where === 'function') {
      // Backward compatibility for 1.x style signature:
      // count(model, cb, where)
      let tmp = options;
      cb = where;
      where = tmp;
    }


    let sqlWhere = this.buildWhere(model, where);

    let cnt = sqlWhere.joins && Object.keys(sqlWhere.joins).length > 0 ? "DISTINCT(" + this.tableEscaped(model) + '.`' + this.idName(model) + "`)" : "*";

    let select = new ParameterizedSQL('SELECT COUNT(' + cnt + ') AS ' + this.escapeName('cnt') + ' FROM ' + this.tableEscaped(model));

    select.merge(this.buildLeftJoins(model, sqlWhere));
    select.merge(sqlWhere);

    let stmt = this.parameterize(select);

    //console.log(stmt.sql,stmt.params)
    this.execute(stmt.sql, stmt.params, options, function (err, res) {
      if (err) {
        return cb(err);
      }

      let c = (res && res[0] && res[0].cnt) || 0;
      // Some drivers return count as a string to contain bigint
      // See https://github.com/brianc/node-postgres/pull/427
      cb(null, Number(c));
    });

  }


}


module.exports = app => {
    return {
        Connector,
        initialize: (dataSource, callback) => {
            initialize.call(this, dataSource);

            dataSource.connector = new Connector(dataSource.settings);
            dataSource.connector.app = app;
            dataSource.connector.dataSource = dataSource;

            if (callback && !dataSource.settings.lazyConnect)
                dataSource.connector.connect(callback);
            else if (callback)
                process.nextTick(function() {
                    callback();
                });



        }
    };
};